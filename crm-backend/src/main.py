"""FastAPI application with OpenAI-compatible chat completions endpoint."""

import json
import logging
import time
import uuid
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from .config import get_settings
from .engine import get_crm_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CRM Query Backend",
    description="OpenAI-compatible API for CRM database queries using LlamaIndex",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# OpenAI-Compatible Models
# ============================================================================


class ChatMessage(BaseModel):
    """OpenAI chat message format."""

    role: str = Field(..., description="The role of the message author (system, user, assistant)")
    content: str = Field(..., description="The content of the message")


class ChatCompletionRequest(BaseModel):
    """OpenAI chat completion request format."""

    model: str = Field(default="crm-sql-engine", description="Model ID to use")
    messages: list[ChatMessage] = Field(..., description="List of messages in the conversation")
    temperature: Optional[float] = Field(default=0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens to generate")
    stream: Optional[bool] = Field(default=False, description="Whether to stream the response")
    user: Optional[str] = Field(default=None, description="User identifier")


class ChatCompletionChoice(BaseModel):
    """OpenAI chat completion choice."""

    index: int
    message: ChatMessage
    finish_reason: str


class ChatCompletionUsage(BaseModel):
    """OpenAI token usage."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    """OpenAI chat completion response format."""

    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: ChatCompletionUsage


class ModelInfo(BaseModel):
    """OpenAI model info."""

    id: str
    object: str = "model"
    created: int
    owned_by: str


class ModelsResponse(BaseModel):
    """OpenAI models list response."""

    object: str = "list"
    data: list[ModelInfo]


# ============================================================================
# Segment Models
# ============================================================================


class SegmentGenerateRequest(BaseModel):
    """Request to generate a segment from description."""

    description: str = Field(..., description="Natural language description of the segment")


class SegmentGenerateResponse(BaseModel):
    """Response with generated segment."""

    name: str
    sql: str


class SegmentExecuteRequest(BaseModel):
    """Request to execute a segment SQL."""

    sql: str = Field(..., description="SQL query to execute")


class SegmentCreateRequest(BaseModel):
    """Request to create a segment view."""

    segmentId: str = Field(..., description="UUID for the segment")
    description: str = Field(..., description="Natural language description")
    currentDate: str = Field(..., description="Today's date in YYYY-MM-DD format")


class SegmentRefreshRequest(BaseModel):
    """Request to refresh a segment view."""

    originalDescription: str = Field(..., description="Original segment description")
    currentDate: str = Field(..., description="Today's date in YYYY-MM-DD format")


class SegmentExecuteViewRequest(BaseModel):
    """Request to execute a segment view."""

    viewName: str = Field(..., description="Name of the view to execute")


# ============================================================================
# Customer Models
# ============================================================================


class CustomerPersonalityRequest(BaseModel):
    """Request body for personality generation."""

    custid: Optional[int] = Field(None, description="Customer ID")
    custcode: Optional[str] = Field(None, description="Customer code")
    custname: Optional[str] = Field(None, description="Customer name")
    custtype: Optional[str] = Field(None, description="Customer type")
    custemail: Optional[str] = Field(None, description="Customer email")
    mobileno: Optional[str] = Field(None, description="Mobile number")
    birthday: Optional[str] = Field(None, description="Birthday")
    joindate: Optional[str] = Field(None, description="Join date")
    status: Optional[str] = Field(None, description="Customer status")
    branchno: Optional[str] = Field(None, description="Branch number")
    cityid: Optional[int] = Field(None, description="City ID")
    customer_type_name: Optional[str] = Field(None, description="Customer type name")
    customer_type_detail_name: Optional[str] = Field(None, description="Customer type detail name")
    city_name: Optional[str] = Field(None, description="City name")
    branchname: Optional[str] = Field(None, description="Branch name")
    transaction_count: Optional[int] = Field(None, description="Number of transactions")
    total_spending: Optional[float] = Field(None, description="Total spending amount")
    last_transaction_date: Optional[str] = Field(None, description="Last transaction date")
    products_purchased: Optional[list[str]] = Field(None, description="List of products purchased")


class CustomerPersonalityResponse(BaseModel):
    """Response with generated personality."""

    summary: str = Field(..., description="Brief overview of the customer")
    preferences: str = Field(..., description="Inferred travel preferences")


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    engine = get_crm_engine()
    db_healthy = engine.health_check()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
    }


@app.get("/v1/models")
async def list_models() -> ModelsResponse:
    """List available models (OpenAI-compatible)."""
    return ModelsResponse(
        data=[
            ModelInfo(
                id="crm-sql-engine",
                created=int(time.time()),
                owned_by="crm-backend",
            ),
            ModelInfo(
                id="crm-chat-assistant",
                created=int(time.time()),
                owned_by="crm-backend",
            ),
        ]
    )


@app.post("/v1/chat/completions", response_model=None)
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completions endpoint.

    Supports two models:
    - crm-sql-engine: Processes natural language queries about CRM data using SQL
    - crm-chat-assistant: Contextual chat using full message history (for customer pages)
    """
    engine = get_crm_engine()
    request_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())

    # Check which model to use
    use_contextual_chat = request.model == "crm-chat-assistant"

    if use_contextual_chat:
        # Contextual chat: use full messages array with system context
        logger.info(f"Using contextual chat with {len(request.messages)} messages")
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        if request.stream:
            return EventSourceResponse(
                stream_contextual_response(engine, messages, request_id, created, request.model),
                media_type="text/event-stream",
            )

        # Non-streaming contextual response
        try:
            response_text = await engine.chat_with_context(messages)

            return ChatCompletionResponse(
                id=request_id,
                created=created,
                model=request.model,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=response_text),
                        finish_reason="stop",
                    )
                ],
                usage=ChatCompletionUsage(
                    prompt_tokens=sum(len(m.content.split()) for m in request.messages),
                    completion_tokens=len(response_text.split()),
                    total_tokens=sum(len(m.content.split()) for m in request.messages) + len(response_text.split()),
                ),
            )
        except Exception as e:
            logger.error(f"Contextual chat error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    else:
        # SQL engine: extract last user message and query database
        user_messages = [m for m in request.messages if m.role == "user"]
        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message provided")

        query = user_messages[-1].content
        logger.info(f"Received SQL query: {query}")

        if request.stream:
            return EventSourceResponse(
                stream_response(engine, query, request_id, created, request.model),
                media_type="text/event-stream",
            )

        # Non-streaming SQL response
        try:
            response_text = await engine.query(query)

            return ChatCompletionResponse(
                id=request_id,
                created=created,
                model=request.model,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=response_text),
                        finish_reason="stop",
                    )
                ],
                usage=ChatCompletionUsage(
                    prompt_tokens=len(query.split()),
                    completion_tokens=len(response_text.split()),
                    total_tokens=len(query.split()) + len(response_text.split()),
                ),
            )
        except Exception as e:
            logger.error(f"SQL query error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


async def stream_response(
    engine, query: str, request_id: str, created: int, model: str
) -> AsyncGenerator[str, None]:
    """Generate streaming SSE response in OpenAI format for SQL queries."""
    try:
        async for chunk in engine.query_streaming(query):
            data = {
                "id": request_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": chunk},
                        "finish_reason": None,
                    }
                ],
            }
            # EventSourceResponse adds "data: " prefix automatically
            yield json.dumps(data)

        # Send final chunk with finish_reason
        final_data = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop",
                }
            ],
        }
        yield json.dumps(final_data)
        yield "[DONE]"

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        error_data = {"error": str(e)}
        yield json.dumps(error_data)


async def stream_contextual_response(
    engine, messages: list[dict], request_id: str, created: int, model: str
) -> AsyncGenerator[str, None]:
    """Generate streaming SSE response in OpenAI format for contextual chat."""
    try:
        async for chunk in engine.chat_with_context_streaming(messages):
            data = {
                "id": request_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": chunk},
                        "finish_reason": None,
                    }
                ],
            }
            yield json.dumps(data)

        # Send final chunk with finish_reason
        final_data = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop",
                }
            ],
        }
        yield json.dumps(final_data)
        yield "[DONE]"

    except Exception as e:
        logger.error(f"Contextual streaming error: {e}")
        error_data = {"error": str(e)}
        yield json.dumps(error_data)


# ============================================================================
# Segment Endpoints
# ============================================================================


@app.post("/api/segments/generate", response_model=SegmentGenerateResponse)
async def generate_segment(request: SegmentGenerateRequest):
    """Generate a customer segment SQL from natural language description."""
    engine = get_crm_engine()

    try:
        result = await engine.generate_segment(request.description)
        return SegmentGenerateResponse(name=result["name"], sql=result["sql"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Segment generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/segments/execute")
async def execute_segment(request: SegmentExecuteRequest):
    """Execute a segment SQL query and return matching customers."""
    engine = get_crm_engine()

    try:
        rows = await engine.execute_segment_sql(request.sql)
        return {"customers": rows, "count": len(rows)}
    except Exception as e:
        logger.error(f"Segment execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/segments/create")
async def create_segment(request: SegmentCreateRequest):
    """Create segment VIEW from description."""
    engine = get_crm_engine()

    try:
        result = await engine.create_segment_view(
            request.segmentId,
            request.description,
            request.currentDate
        )
        return result
    except ValueError as e:
        logger.error(f"Segment creation validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Segment creation runtime error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Segment creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal membuat segmen: {str(e)}")


@app.post("/api/segments/{segment_id}/refresh")
async def refresh_segment(segment_id: str, request: SegmentRefreshRequest):
    """Refresh existing segment VIEW with new dates."""
    engine = get_crm_engine()

    try:
        result = await engine.refresh_segment_view(
            segment_id,
            request.originalDescription,
            request.currentDate
        )
        return result
    except ValueError as e:
        logger.error(f"Segment refresh validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Segment refresh runtime error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Segment refresh error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memperbarui segmen: {str(e)}")


@app.post("/api/segments/execute-view")
async def execute_segment_view(request: SegmentExecuteViewRequest):
    """Execute SELECT from VIEW."""
    engine = get_crm_engine()

    try:
        rows = await engine.execute_view(request.viewName)
        return {"customers": rows, "count": len(rows)}
    except RuntimeError as e:
        logger.error(f"View execution runtime error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"View execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mengeksekusi VIEW: {str(e)}")


# ============================================================================
# Customer Endpoints
# ============================================================================


@app.get("/api/customer/{customer_id}")
async def get_customer(customer_id: int):
    """
    Fetch customer data from MySQL by custid.

    Returns all customer fields as JSON, including related data
    from customertype, customertypedtl, city, and branch tables.
    """
    engine = get_crm_engine()

    try:
        customer = await engine.get_customer_by_id(customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail=f"Pelanggan dengan ID {customer_id} tidak ditemukan"
            )

        return customer

    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Customer fetch runtime error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Customer fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mengambil data pelanggan: {str(e)}")


@app.post("/api/customer/{customer_id}/personality", response_model=CustomerPersonalityResponse)
async def generate_customer_personality(customer_id: int, request: CustomerPersonalityRequest):
    """
    Generate personality analysis for a customer using LLM.

    Takes customer data as input and returns a summary and preferences
    in Indonesian language.
    """
    engine = get_crm_engine()

    try:
        # Convert request to dict, excluding None values
        customer_data = request.model_dump(exclude_none=True)

        # Ensure customer_id is included
        customer_data["custid"] = customer_id

        result = await engine.generate_customer_personality(customer_data)

        return CustomerPersonalityResponse(
            summary=result["summary"],
            preferences=result["preferences"]
        )

    except ValueError as e:
        logger.error(f"Customer personality validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Customer personality generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisis kepribadian: {str(e)}")


# ============================================================================
# Entry Point
# ============================================================================


def main():
    """Run the server."""
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()

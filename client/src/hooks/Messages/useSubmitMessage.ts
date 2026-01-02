import { v4 } from 'uuid';
import { useCallback } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { Constants, replaceSpecialVars } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { useChatContext, useChatFormContext, useAddedChatContext } from '~/Providers';
import { useAuthContext } from '~/hooks/AuthContext';
import { createSegment } from '~/data-provider/Segments';
import store from '~/store';

// Constants for segment command
const NO_PARENT = '00000000-0000-0000-0000-000000000000';

const appendIndex = (index: number, value?: string) => {
  if (!value) {
    return value;
  }
  return `${value}${Constants.COMMON_DIVIDER}${index}`;
};

export default function useSubmitMessage() {
  const { user } = useAuthContext();
  const methods = useChatFormContext();
  const { ask, index, getMessages, setMessages, latestMessage, conversation } = useChatContext();
  const { addedIndex, ask: askAdditional, conversation: addedConvo } = useAddedChatContext();

  const autoSendPrompts = useRecoilValue(store.autoSendPrompts);
  const activeConvos = useRecoilValue(store.allConversationsSelector);
  const setActivePrompt = useSetRecoilState(store.activePromptByIndex(index));

  const submitMessage = useCallback(
    async (data?: { text: string }) => {
      if (!data) {
        return console.warn('No data provided to submitMessage');
      }

      // Intercept /segment command
      const segmentMatch = data.text.match(/^\/segment\s+(.+)$/i);
      if (segmentMatch) {
        const description = segmentMatch[1].trim();
        const currentMessages = getMessages() || [];
        const conversationId = conversation?.conversationId || v4();
        const now = new Date().toISOString();

        // Find the last message to use as parent
        const lastMessage = currentMessages[currentMessages.length - 1];
        const parentMessageId = lastMessage?.messageId || NO_PARENT;

        // Create user message
        const userMessageId = v4();
        const userMessage: TMessage = {
          messageId: userMessageId,
          conversationId,
          parentMessageId,
          text: data.text,
          sender: 'User',
          isCreatedByUser: true,
          createdAt: now,
          updatedAt: now,
        };

        // Add user message to conversation
        setMessages([...currentMessages, userMessage]);
        methods.reset();

        // Create assistant message (will be updated with result)
        const assistantMessageId = v4();
        let assistantMessage: TMessage = {
          messageId: assistantMessageId,
          conversationId,
          parentMessageId: userMessageId,
          text: 'Membuat segment...',
          sender: 'CRM Assistant',
          isCreatedByUser: false,
          createdAt: now,
          updatedAt: now,
        };

        // Add "loading" assistant message
        setMessages([...currentMessages, userMessage, assistantMessage]);

        try {
          const segment = await createSegment({ description });

          // Update assistant message with success response
          const segmentUrl = `/segments?selected=${segment.segmentId}`;
          assistantMessage = {
            ...assistantMessage,
            text: `Segment berhasil dibuat!\n\n**${segment.name}**\n\n${segment.description || ''}\n\n[Lihat Segment](${segmentUrl})`,
            updatedAt: new Date().toISOString(),
          };

          setMessages([...currentMessages, userMessage, assistantMessage]);
        } catch (error) {
          console.error('[/segment] Error creating segment:', error);

          // Update assistant message with error
          assistantMessage = {
            ...assistantMessage,
            text: 'Gagal membuat segment. Silakan coba lagi.',
            error: true,
            updatedAt: new Date().toISOString(),
          };

          setMessages([...currentMessages, userMessage, assistantMessage]);
        }

        return; // Don't send to LLM
      }

      const rootMessages = getMessages();
      const isLatestInRootMessages = rootMessages?.some(
        (message) => message.messageId === latestMessage?.messageId,
      );
      if (!isLatestInRootMessages && latestMessage) {
        setMessages([...(rootMessages || []), latestMessage]);
      }

      const hasAdded = addedIndex && activeConvos[addedIndex] && addedConvo;
      const isNewMultiConvo =
        hasAdded &&
        activeConvos.every((convoId) => convoId === Constants.NEW_CONVO) &&
        !rootMessages?.length;
      const overrideConvoId = isNewMultiConvo ? v4() : undefined;
      const overrideUserMessageId = hasAdded ? v4() : undefined;
      const rootIndex = addedIndex - 1;
      const clientTimestamp = new Date().toISOString();

      ask({
        text: data.text,
        overrideConvoId: appendIndex(rootIndex, overrideConvoId),
        overrideUserMessageId: appendIndex(rootIndex, overrideUserMessageId),
        clientTimestamp,
      });

      if (hasAdded) {
        askAdditional(
          {
            text: data.text,
            overrideConvoId: appendIndex(addedIndex, overrideConvoId),
            overrideUserMessageId: appendIndex(addedIndex, overrideUserMessageId),
            clientTimestamp,
          },
          { overrideMessages: rootMessages },
        );
      }
      methods.reset();
    },
    [
      ask,
      methods,
      addedIndex,
      addedConvo,
      setMessages,
      getMessages,
      activeConvos,
      askAdditional,
      latestMessage,
      conversation,
    ],
  );

  const submitPrompt = useCallback(
    (text: string) => {
      const parsedText = replaceSpecialVars({ text, user });
      if (autoSendPrompts) {
        submitMessage({ text: parsedText });
        return;
      }

      const currentText = methods.getValues('text');
      const newText = currentText.trim().length > 1 ? `\n${parsedText}` : parsedText;
      setActivePrompt(newText);
    },
    [autoSendPrompts, submitMessage, setActivePrompt, methods, user],
  );

  return { submitMessage, submitPrompt };
}

export default function TableIcon({ className = 'icon-sm' }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 6C3 4.34315 4.34315 3 6 3H18C19.6569 3 21 4.34315 21 6V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6ZM6 5H18C18.5523 5 19 5.44772 19 6V8H5V6C5 5.44772 5.44772 5 6 5ZM5 10H10V14H5V10ZM5 16H10V19H6C5.44772 19 5 18.5523 5 18V16ZM12 19V16H19V18C19 18.5523 18.5523 19 18 19H12ZM19 14H12V10H19V14Z"
        fill="currentColor"
      />
    </svg>
  );
}

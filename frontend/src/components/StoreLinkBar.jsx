import { useState } from "react";
import { HiOutlineClipboard, HiOutlineExternalLink, HiCheck } from "react-icons/hi";

export default function StoreLinkBar({ storeUrl }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (older browsers, insecure context) - fall
      // back silently, the link is still visible and selectable.
    }
  };

  if (!storeUrl) return null;

  return (
    <div className="flex items-center gap-2 bg-brand-50 dark:bg-gray-800 border border-brand-100 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
      <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Your store:</span>
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-700 dark:text-brand-400 font-medium truncate max-w-[220px]"
      >
        {storeUrl}
      </a>
      <button onClick={handleCopy} className="text-gray-500 hover:text-brand-600" title="Copy link">
        {copied ? <HiCheck /> : <HiOutlineClipboard />}
      </button>
      <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand-600" title="Open store">
        <HiOutlineExternalLink />
      </a>
    </div>
  );
}

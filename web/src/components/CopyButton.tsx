import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export default function CopyButton({ text, className = '', label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  }, [text, toast]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors duration-150 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
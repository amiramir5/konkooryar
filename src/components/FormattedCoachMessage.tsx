import React from 'react';

interface FormattedCoachMessageProps {
  content: string;
}

/**
 * Parses model output, cleans any raw asterisks, hashes, and markdown slop,
 * and renders headings with stylish color badges/callouts and clean bold typography.
 */
export const FormattedCoachMessage: React.FC<FormattedCoachMessageProps> = ({ content }) => {
  if (!content) return null;

  // Split content by lines
  const lines = content.split('\n');

  // Palette of beautiful colors for sequential section headings
  const headingColors = [
    {
      badge: 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-300',
      dot: 'bg-blue-600',
    },
    {
      badge: 'bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-800',
      text: 'text-cyan-900 dark:text-cyan-300',
      dot: 'bg-cyan-600',
    },
    {
      badge: 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800',
      text: 'text-indigo-900 dark:text-indigo-300',
      dot: 'bg-indigo-600',
    },
    {
      badge: 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800',
      text: 'text-sky-900 dark:text-sky-300',
      dot: 'bg-sky-600',
    },
    {
      badge: 'bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800',
      text: 'text-teal-900 dark:text-teal-300',
      dot: 'bg-teal-600',
    },
  ];

  let headingCount = 0;

  // Render inline spans, replacing **bold** and URLs with high-contrast clickable styled elements
  const renderInline = (rawText: string) => {
    // Remove standalone hash characters or leftover markdown artifact
    let text = rawText.replace(/^[#\s]+/, '');

    // Split on markdown links [title](url) OR raw URLs OR bold patterns
    // First, convert markdown links [title](url) and raw URLs
    const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|https?:\/\/[^\s\)]+|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Markdown link: [title](url)
      const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
      if (mdLinkMatch) {
        return (
          <a
            key={i}
            href={mdLinkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-800 dark:hover:text-blue-300 mx-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[11px]"
            dir="ltr"
          >
            {mdLinkMatch[1]} ↗
          </a>
        );
      }

      // Raw URL
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono underline hover:text-blue-800 dark:hover:text-blue-300 mx-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[10px]"
            dir="ltr"
          >
            {part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 32)}… ↗
          </a>
        );
      }

      // Bold text
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('*') && part.endsWith('*'))) {
        const cleaned = part.replace(/^\*+|\*+$/g, '').trim();
        return (
          <strong
            key={i}
            className="font-black text-blue-950 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-900/40 px-1 py-0.5 rounded-sm mx-0.5"
          >
            {cleaned}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }

        // Check if line looks like a title or numbered heading
        // e.g. "۱. شروع تدریجی و پایدار:" or "# تیتر" or "**تیتر اصلی:**"
        const isHeading =
          /^([#]{1,4}\s+|(\d+|[۰-۹]+)[\.\-\)]\s+|\*\*([^*]+?)\*\*[:\s]*$)/.test(line) ||
          (/^(\*\*|\*)/.test(line) && line.endsWith(':**')) ||
          (/^(\*\*|\*)/.test(line) && line.endsWith(':*'));

        if (isHeading) {
          const style = headingColors[headingCount % headingColors.length];
          headingCount++;

          // Clean heading text completely
          const cleanedHeading = line
            .replace(/^[#\s]+/, '')
            .replace(/^\*+|\*+$/g, '')
            .replace(/\*\*+/g, '')
            .trim();

          return (
            <div
              key={idx}
              className={`mt-3 mb-1.5 p-2 rounded-xl border flex items-center gap-2 font-black ${style.badge}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <span className="text-xs sm:text-[13px] tracking-tight">{cleanedHeading}</span>
            </div>
          );
        }

        // Check if line is a bullet point
        const isBullet = /^[•\-\*]\s+/.test(line);
        if (isBullet) {
          const bulletText = line.replace(/^[•\-\*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pr-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div className="flex-1">{renderInline(bulletText)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="py-0.5">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

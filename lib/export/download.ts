/**
 * Browser download utilities
 */

/**
 * Trigger a browser download of text content as a file
 *
 * @param content - The text content to download
 * @param filename - The name of the file to save as
 */
export const downloadMarkdown = (content: string, filename: string): void => {
  // Create blob with markdown content
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

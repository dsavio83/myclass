import React from 'react';

// Shared utilities for flashcard functionality

// Utility function for quote replacement
export const sanitizeQuotes = (text: string): string => {
    return text
        .replace(/'/g, '"')  // Replace single quotes with double quotes
        .replace(/"/g, '"')  // Replace HTML double quote entities
        .replace(/'/g, "'")   // Replace HTML single quote entities
        .replace(/'/g, "'") // Replace HTML apostrophe entities
        .replace(/&lsquo;/g, "'") // Replace left single quotation mark
        .replace(/&rsquo;/g, "'") // Replace right single quotation mark
        .replace(/&ldquo;/g, '"') // Replace left double quotation mark
        .replace(/&rdquo;/g, '"'); // Replace right double quotation mark
};

// Safe HTML renderer component with encoding/decoding support
export const SafeHTML: React.FC<{ html: string; className?: string }> = ({ html, className = '' }) => {
    // Enhanced HTML processing with proper encoding/decoding
    const processHTML = (text: string): string => {
        return text
            // Decode HTML entities first
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, "'")
            .replace(/'/g, "'")
            .replace(/&nbsp;/g, ' ')
            
            // Handle HTML entities for symbols
            .replace(/&copy;/g, '©')
            .replace(/&reg;/g, '®')
            .replace(/&trade;/g, '™')
            .replace(/&deg;/g, '°')
            .replace(/&plusmn;/g, '±')
            .replace(/&times;/g, '×')
            .replace(/&divide;/g, '÷')
            .replace(/&euro;/g, '€')
            .replace(/&pound;/g, '£')
            .replace(/&yen;/g, '¥')
            .replace(/&cent;/g, '¢')
            .replace(/&dollar;/g, '$')
            
            // Handle mathematical symbols
            .replace(/&sum;/g, '∑')
            .replace(/&prod;/g, '∏')
            .replace(/&infin;/g, '∞')
            .replace(/&approx;/g, '≈')
            .replace(/&ne;/g, '≠')
            .replace(/&le;/g, '≤')
            .replace(/&ge;/g, '≥')
            .replace(/<=/g, '≤')
            .replace(/>=/g, '≥')
            
            // Convert line breaks
            .replace(/\n/g, '<br>')
            
            // Handle bold tags (both HTML and markdown)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/<bold>([^<]+)<\/bold>/g, '<strong>$1</strong>')
            .replace(/<b>([^<]+)<\/b>/g, '<strong>$1</strong>')
            
            // Handle italic tags (both HTML and markdown)
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/<i>([^<]+)<\/i>/g, '<em>$1</em>')
            
            // Handle underline tags
            .replace(/<u>([^<]+)<\/u>/g, '<u>$1</u>')
            
            // Handle subscript
            .replace(/<sub>([^<]+)<\/sub>/g, '<sub>$1</sub>')
            
            // Handle superscript
            .replace(/<sup>([^<]+)<\/sup>/g, '<sup>$1</sup>')
            
            // Handle code tags
            .replace(/<code>([^<]+)<\/code>/g, '<code>$1</code>')
            
            // Handle paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)/, '<p>$1')
            .replace(/(.+)$/, '$1</p>')
            
            // Re-encode any potential script tags or dangerous content
            .replace(/<script/gi, '<script')
            .replace(/<\/script>/gi, '</script>')
            .replace(/javascript:/gi, 'javascript:')
            .replace(/on\w+\s*=/gi, '');
    };

    const processedHTML = processHTML(html);

    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: processedHTML }}
        />
    );
};
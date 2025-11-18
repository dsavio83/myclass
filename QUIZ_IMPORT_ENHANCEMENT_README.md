# Quiz Import with Enhanced Text Processing

## Overview
The quiz import feature has been enhanced to automatically handle:
- **Quote replacement**: Replace `"` with `"` and `'` with `'`
- **HTML entity decoding**: Decode `&`, `<`, `>`, `&nbsp;`, etc.
- **HTML tag removal**: Remove any HTML tags from text content
- **Smart quotes**: Handle smart quotes and special characters
- **Numeric entities**: Decode both decimal and hexadecimal HTML entities

## Test Data
The `test-quiz-import.json` file contains sample quiz questions that demonstrate the text processing capabilities.

## Usage Instructions

### 1. Opening the Import Modal
- Click the "Import Quiz" button in the Quiz Management interface
- The modal will display enhanced instructions about the automatic text processing

### 2. Pasting Text
- Paste your quiz data into the textarea
- The system will automatically process:
  - HTML entities like `"`, `'`, `&`, `<`, `>`
  - Smart quotes like `"`, `"`, `'`, `'`
  - HTML tags like `<p>`, `<strong>`, etc.
  - Numeric entities like `&#8212;`, `&#x2014;`

### 3. Processing Status
- Click "Import" to start processing
- A loading spinner will appear during processing
- The system will decode all text automatically

### 4. Error Handling
- Invalid JSON will show error messages
- Processing errors will be displayed
- Successfully imported questions will appear in the quiz list

## Example Transformations

### Before Processing (Raw Input):
```json
{
  "question": "What is "2 + 2" equal to?",
  "hint": "Think about <basic> math addition. <p>This tests arithmetic.</p>"
}
```

### After Processing (Clean Output):
```json
{
  "question": "What is "2 + 2" equal to?",
  "hint": "Think about basic math addition. This tests arithmetic."
}
```

## Features Added

1. **Enhanced Text Processing Functions**:
   - `decodeAndProcessText()`: Main text cleaning function
   - `processQuizData()`: Recursive processing for all data types

2. **Improved Import Modal**:
   - Processing status indicator
   - Enhanced instructions
   - Error handling with detailed messages
   - Disabled states during processing

3. **Consistent Data Loading**:
   - Quiz data loading uses the same text processing
   - Consistent encoding across the application

## Testing
The enhanced import system is now ready for testing with real quiz data containing HTML entities, smart quotes, and other special characters.
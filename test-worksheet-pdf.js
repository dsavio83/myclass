const api = require('./services/api');

async function testWorksheetUpload() {
    try {
        console.log('=== Testing Worksheet PDF Upload ===');

        // First, let's see what lessons exist
        console.log('\n1. Getting lessons...');
        const lessons = await api.getLessons();
        console.log(`Found ${lessons.length} lessons`);

        if (lessons.length === 0) {
            console.log('No lessons found. Creating a test lesson...');
            // You may need to create a lesson first
            return;
        }

        // Use first lesson for testing
        const testLesson = lessons[0];
        console.log(`Using lesson: ${testLesson.name} (${testLesson._id})`);

        // Create a simple PDF file for testing
        const fs = require('fs');
        const path = require('path');

        const testPdfPath = path.join(__dirname, 'test-document.pdf');

        // Create a minimal PDF if it doesn't exist
        if (!fs.existsSync(testPdfPath)) {
            console.log('\n2. Creating test PDF...');
            const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for worksheet upload) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
301
%%EOF`;

            fs.writeFileSync(testPdfPath, pdfContent);
            console.log('Created test PDF file');
        }

        // Read the PDF file
        const pdfBuffer = fs.readFileSync(testPdfPath);
        const pdfFile = new File([pdfBuffer], 'test-worksheet.pdf', { type: 'application/pdf' });

        console.log('\n3. Testing file upload...');
        console.log(`PDF size: ${pdfFile.size} bytes`);
        console.log(`PDF type: ${pdfFile.type}`);

        // Upload via FileUploadHelper
        const FileUploadHelper = require('./services/fileStorage').FileUploadHelper;

        const uploadResult = await FileUploadHelper.uploadFile(
            pdfFile,
            testLesson._id,
            'worksheet',
            'Test Worksheet Upload'
        );

        console.log('\n4. Upload result:');
        console.log('File ID:', uploadResult.fileId);
        console.log('File Path:', uploadResult.path);
        console.log('API Response:', uploadResult.apiResponse);

        // Get the file URL
        const fileUrl = FileUploadHelper.getFileUrl(uploadResult.fileId);
        console.log('Generated file URL:', fileUrl);

        console.log('\n5. Testing file serving...');
        if (fileUrl) {
            try {
                const response = await fetch(fileUrl);
                console.log(`File serving status: ${response.status}`);
                console.log(`Content-Type: ${response.headers.get('content-type')}`);

                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    console.log(`File served successfully, size: ${buffer.byteLength} bytes`);
                } else {
                    console.log('File serving failed');
                }
            } catch (error) {
                console.log('File serving error:', error.message);
            }
        }

        console.log('\n=== Test completed ===');

    } catch (error) {
        console.error('Test error:', error);
    }
}

testWorksheetUpload();
// Simple test to verify worksheet PDF upload using built-in fetch
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = 'http://localhost:3002/api'; // Note: API runs on port 3002
const TEST_PDF_PATH = './test-document.pdf';

async function testWorksheetUpload() {
    try {
        console.log('🧪 Testing Worksheet PDF Upload...\n');

        // Step 1: Check if test PDF exists
        if (!fs.existsSync(TEST_PDF_PATH)) {
            console.log(`❌ Test PDF not found at ${TEST_PDF_PATH}`);
            return;
        }
        console.log(`✅ Test PDF found: ${TEST_PDF_PATH}`);

        // Step 2: Get a lesson ID
        console.log('1. Fetching available lessons...');
        const lessonsResponse = await fetch(`${API_BASE}/lessons`);
        const lessons = await lessonsResponse.json();
        
        if (lessons.length === 0) {
            console.log('❌ No lessons found in the system');
            return;
        }
        
        const lessonId = lessons[0]._id;
        console.log(`✅ Using lesson: ${lessons[0].name} (${lessonId})`);

        // Step 3: Upload PDF worksheet
        console.log('2. Uploading PDF worksheet...');
        
        const formData = new FormData();
        formData.append('file', new Blob([fs.readFileSync(TEST_PDF_PATH)]), 'test-document.pdf');
        formData.append('lessonId', lessonId);
        formData.append('type', 'worksheet');
        formData.append('title', 'Test Worksheet Upload - ' + Date.now());
        
        const uploadResponse = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.log('❌ Upload failed:', uploadResponse.status, errorText);
            return;
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ PDF uploaded successfully!');
        console.log('Response:', {
            success: uploadResult.success,
            filename: uploadResult.fileInfo?.filename,
            path: uploadResult.fileInfo?.path,
            contentId: uploadResult.content?._id
        });

        // Step 4: Test file serving
        console.log('\n3. Testing file serving...');
        const filename = uploadResult.fileInfo?.filename;
        if (filename) {
            try {
                const fileResponse = await fetch(`${API_BASE}/files/${filename}`);
                if (fileResponse.ok) {
                    console.log('✅ File serving works!');
                    console.log('Content-Type:', fileResponse.headers.get('content-type'));
                    console.log('Content-Length:', fileResponse.headers.get('content-length'));
                } else {
                    console.log('❌ File serving failed:', fileResponse.status);
                }
            } catch (error) {
                console.log('❌ File serving error:', error.message);
            }
        }

        // Step 5: Get worksheet content
        console.log('\n4. Fetching worksheet content...');
        const contentResponse = await fetch(`${API_BASE}/content?lessonId=${lessonId}&type=worksheet`);
        const contentData = await contentResponse.json();
        
        const worksheets = contentData.find(group => group.type === 'worksheet');
        if (worksheets && worksheets.docs.length > 0) {
            console.log(`✅ Found ${worksheets.count} worksheets`);
            const worksheet = worksheets.docs[worksheets.docs.length - 1]; // Get latest
            console.log('Latest worksheet details:', {
                id: worksheet._id,
                title: worksheet.title,
                body: worksheet.body?.substring(0, 100) + '...',
                metadata: worksheet.metadata
            });
        } else {
            console.log('❌ No worksheets found after upload');
        }

        console.log('\n🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testWorksheetUpload();
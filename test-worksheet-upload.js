// Test script to verify worksheet upload functionality
const testUpload = async () => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Create a simple test PDF content
        const testPdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test Worksheet) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n293\n%%EOF';
        
        // Write test PDF to a temporary file
        const testFilePath = path.join(__dirname, 'test-worksheet.pdf');
        fs.writeFileSync(testFilePath, testPdfContent);
        
        const FormData = require('form-data');
        const axios = require('axios');
        const form = new FormData();
        
        // Add file
        form.append('file', fs.createReadStream(testFilePath));
        form.append('lessonId', '6921e9fcfd703ba03e47aaef'); // Valid lesson ID from the logs
        form.append('type', 'worksheet');
        form.append('title', 'Test Worksheet Upload');
        
        console.log('Testing worksheet upload...');
        
        const response = await axios.post('http://localhost:3000/api/upload', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });
        
        console.log('Upload successful!');
        console.log('Response:', response.data);
        
        // Clean up
        fs.unlinkSync(testFilePath);
        
        return true;
        
    } catch (error) {
        console.error('Upload test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return false;
    }
};

// Run the test
testUpload().then(success => {
    if (success) {
        console.log('\n✅ Worksheet upload test PASSED');
    } else {
        console.log('\n❌ Worksheet upload test FAILED');
    }
    process.exit(success ? 0 : 1);
});
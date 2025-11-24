const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3002/api';

async function runTest() {
    try {
        console.log('1. Fetching lessons to get a valid lessonId...');
        const lessonsResponse = await axios.get(`${API_URL}/lessons`);
        const lessons = lessonsResponse.data;

        if (lessons.length === 0) {
            console.error('No lessons found. Cannot test upload.');
            return;
        }

        const lesson = lessons[0];
        console.log(`Using lesson: ${lesson.name} (${lesson._id})`);

        console.log('2. Creating dummy audio file...');
        const dummyFilePath = path.join(__dirname, 'test_audio.mp3');
        fs.writeFileSync(dummyFilePath, 'dummy audio content');

        console.log('3. Uploading file...');
        const form = new FormData();
        form.append('file', fs.createReadStream(dummyFilePath));
        form.append('lessonId', lesson._id);
        form.append('type', 'audio');
        form.append('title', 'Test Audio Upload');

        const uploadResponse = await axios.post(`${API_URL}/upload`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Upload Response:', uploadResponse.data);
        console.log('SUCCESS: File uploaded successfully.');

        // Cleanup
        fs.unlinkSync(dummyFilePath);

        // Optional: Delete the uploaded content to clean up DB
        if (uploadResponse.data.content && uploadResponse.data.content._id) {
            console.log('4. Cleaning up uploaded content...');
            await axios.delete(`${API_URL}/content/${uploadResponse.data.content._id}`);
            console.log('Cleanup successful.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

runTest();

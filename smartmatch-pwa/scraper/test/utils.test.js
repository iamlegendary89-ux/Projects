// scraper/test/utils.test.js
const assert = require('assert');
const { cleanJsonString, normalizePhoneName } = require('../utils/helpers'); // Assuming you'll move the helpers here

describe('Utility Functions', () => {

    describe('cleanJsonString', () => {
        it('should extract JSON from a markdown block', () => {
            const markdown = 'Some text ```json\n{"key": "value"}\n```';
            assert.strictEqual(cleanJsonString(markdown), '{"key": "value"}');
        });

        it('should extract JSON from a string with surrounding text', () => {
            const text = 'Here is the JSON: {"key": "value"}';
            assert.strictEqual(cleanJsonString(text), '{"key": "value"}');
        });

        it('should return the string if it is already valid JSON', () => {
            const json = '{"key": "value"}';
            assert.strictEqual(cleanJsonString(json), '{"key": "value"}');
        });

        it('should return null for null input', () => {
            assert.strictEqual(cleanJsonString(null), null);
        });
    });

    describe('normalizePhoneName', () => {
        it('should convert to lowercase', () => {
            assert.strictEqual(normalizePhoneName('iPhone 15 PRO'), 'iphone 15 pro');
        });

        it('should remove text in parentheses', () => {
            assert.strictEqual(normalizePhoneName('Nothing Phone (2a)'), 'nothing phone');
        });

        it('should replace "plus" with "+"', () => {
            assert.strictEqual(normalizePhoneName('Galaxy S25 Plus'), 'galaxy s25 +');
        });

        it('should handle "pro max" correctly', () => {
            assert.strictEqual(normalizePhoneName('iPhone 17 Pro Max'), 'iphone 17 pro max');
        });

        it('should normalize spaces and hyphens', () => {
            assert.strictEqual(normalizePhoneName('  Google  Pixel-9 '), 'google pixel 9');
        });

        it('should handle a combination of rules', () => {
            assert.strictEqual(normalizePhoneName('Samsung Galaxy Z Fold5 (Global)'), 'samsung galaxy z fold5');
        });
    });

});

import { assert } from '@sinonjs/referee';
import { aspectRatios, calcAspectRatio } from './aspect-ratios.js';

describe('lib/aspect-ratios', () => {
	describe('calcAspectRatios', () => {
		describe('16:9 resolutions', () => {
			it('should return 16_9 for 1280x720', () => {
				const input = { width: 1280, height: 720 };
				const expected = aspectRatios['16_9'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 16_9 for 1920x1080', () => {
				const input = { width: 1920, height: 1080 };
				const expected = aspectRatios['16_9'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 16_9 for 256x144', () => {
				const input = { width: 256, height: 144 };
				const expected = aspectRatios['16_9'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 16_9 for 768x432', () => {
				const input = { width: 768, height: 432 };
				const expected = aspectRatios['16_9'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});
		});

		describe('9:16 resolutions', () => {
			it('should return 9_16 for 720x1280', () => {
				const input = { width: 720, height: 1280 };
				const expected = aspectRatios['9_16'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 9_16 for 1080x1920', () => {
				const input = { width: 1080, height: 1920 };
				const expected = aspectRatios['9_16'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 9_16 for 144x256', () => {
				const input = { width: 144, height: 256 };
				const expected = aspectRatios['9_16'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 9_16 for 432x768', () => {
				const input = { width: 432, height: 768 };
				const expected = aspectRatios['9_16'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});
		});

		describe('1:1 resolutions', () => {
			it('should return 1_1 for 1x1', () => {
				const input = { width: 1, height: 1 };
				const expected = aspectRatios['1_1'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});

			it('should return 1_1 for 1280x1280', () => {
				const input = { width: 1280, height: 1280 };
				const expected = aspectRatios['1_1'];

				const actual = calcAspectRatio(input);

				assert.equals(actual, expected);
			});
		});
	});
});

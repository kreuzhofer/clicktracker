import { YouTubeService } from '../../../src/services/YouTubeService';
import { MockYouTubeService } from '../../../src/services/MockYouTubeService';

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;
  let mockYoutubeService: MockYouTubeService;

  beforeEach(() => {
    mockYoutubeService = new MockYouTubeService();
    youtubeService = new YouTubeService({ apiKey: 'test-api-key' });
  });

  describe('URL Validation', () => {
    describe('validateYouTubeUrl', () => {
      it('should validate standard YouTube URLs', () => {
        const testCases = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ',
          'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'http://youtube.com/watch?v=dQw4w9WgXcQ'
        ];

        testCases.forEach(url => {
          const result = youtubeService.validateYouTubeUrl(url);
          expect(result.isValid).toBe(true);
          expect(result.videoId).toBe('dQw4w9WgXcQ');
          expect(result.error).toBeUndefined();
        });
      });

      it('should validate YouTube short URLs', () => {
        const testCases = [
          'https://youtu.be/dQw4w9WgXcQ',
          'http://youtu.be/dQw4w9WgXcQ'
        ];

        testCases.forEach(url => {
          const result = youtubeService.validateYouTubeUrl(url);
          expect(result.isValid).toBe(true);
          expect(result.videoId).toBe('dQw4w9WgXcQ');
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid YouTube URLs', () => {
        const testCases = [
          'https://www.google.com',
          'https://vimeo.com/123456789',
          'not-a-url',
          ''
        ];

        testCases.forEach(url => {
          const result = youtubeService.validateYouTubeUrl(url);
          expect(result.isValid).toBe(false);
          expect(result.videoId).toBeUndefined();
          expect(result.error).toBeDefined();
        });
      });
    });

    describe('extractVideoId', () => {
      it('should extract video ID from valid URLs', () => {
        const testCases = [
          { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
          { url: 'https://youtu.be/jNQXAC9IVRw', expected: 'jNQXAC9IVRw' }
        ];

        testCases.forEach(({ url, expected }) => {
          const videoId = youtubeService.extractVideoId(url);
          expect(videoId).toBe(expected);
        });
      });

      it('should return null for invalid URLs', () => {
        const testCases = [
          'https://www.google.com',
          'invalid-url'
        ];

        testCases.forEach(url => {
          const videoId = youtubeService.extractVideoId(url);
          expect(videoId).toBeNull();
        });
      });
    });
  });

  describe('Mock YouTube Service', () => {
    describe('getVideoMetadata', () => {
      it('should return metadata for known videos', async () => {
        const metadata = await mockYoutubeService.getVideoMetadata('dQw4w9WgXcQ');
        
        expect(metadata).toBeDefined();
        expect(metadata.video_id).toBe('dQw4w9WgXcQ');
        expect(metadata.title).toBe('Rick Astley - Never Gonna Give You Up (Official Video)');
        expect(metadata.view_count).toBeGreaterThan(0);
        expect(metadata.channel_title).toBe('Rick Astley');
        expect(metadata.thumbnail_url).toContain('dQw4w9WgXcQ');
        expect(metadata.published_at).toBeInstanceOf(Date);
      });

      it('should generate metadata for unknown videos', async () => {
        const metadata = await mockYoutubeService.getVideoMetadata('unknown1234');
        
        expect(metadata).toBeDefined();
        expect(metadata.video_id).toBe('unknown1234');
        expect(metadata.title).toContain('unknown1234');
        expect(metadata.view_count).toBeGreaterThan(0);
        expect(metadata.channel_title).toBeDefined();
        expect(metadata.thumbnail_url).toContain('unknown1234');
        expect(metadata.published_at).toBeInstanceOf(Date);
      });
    });

    describe('healthCheck', () => {
      it('should return true when healthy', async () => {
        const isHealthy = await mockYoutubeService.healthCheck();
        expect(isHealthy).toBe(true);
      });
    });
  });
});
from flask import send_from_directory
import os
import datetime
import json

class VideoManager:
    def __init__(self):
        self.video_dir = 'static/videos'
        self.stats_dir = 'static/stats'
        os.makedirs(self.video_dir, exist_ok=True)
        os.makedirs(self.stats_dir, exist_ok=True)

    def save_video(self, video_data, user_id, posture_data):
        # 영상 파일명 생성
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'study_session_{user_id}_{timestamp}.webm'
        filepath = os.path.join(self.video_dir, filename)

        # 영상 저장
        with open(filepath, 'wb') as f:
            f.write(video_data)

        # 자세 데이터 저장
        stats_filename = f'stats_{user_id}_{timestamp}.json'
        stats_filepath = os.path.join(self.stats_dir, stats_filename)
        with open(stats_filepath, 'w') as f:
            json.dump({
                'video_id': filename,
                'duration': posture_data['duration'],
                'posture_records': posture_data['records'],
                'bad_posture_count': posture_data['bad_posture_count']
            }, f)

        return filename

    def get_user_videos(self, user_id, page=1, per_page=10):
        # 사용자의 영상 목록 조회
        videos = []
        for filename in os.listdir(self.video_dir):
            if filename.startswith(f'study_session_{user_id}_'):
                stats_filename = f'stats_{filename[13:-5]}.json'
                stats_path = os.path.join(self.stats_dir, stats_filename)
                
                if os.path.exists(stats_path):
                    with open(stats_path, 'r') as f:
                        stats = json.load(f)
                        videos.append({
                            'id': filename[:-5],
                            'filename': filename,
                            'date': filename.split('_')[2][:8],
                            'duration': stats['duration'],
                            'bad_posture_count': stats['bad_posture_count']
                        })

        # 페이지네이션
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        return sorted(videos, key=lambda x: x['date'], reverse=True)[start_idx:end_idx]

    def get_user_stats(self, user_id, start_date=None, end_date=None):
        # 기간별 통계 데이터 집계
        stats = {
            'total_study_time': 0,
            'avg_daily_time': 0,
            'posture_stats': {
                'good': 0,
                'bad': 0
            },
            'daily_stats': {}
        }

        for filename in os.listdir(self.stats_dir):
            if filename.startswith(f'stats_{user_id}_'):
                with open(os.path.join(self.stats_dir, filename), 'r') as f:
                    data = json.load(f)
                    date = filename.split('_')[2][:8]
                    
                    if start_date and date < start_date:
                        continue
                    if end_date and date > end_date:
                        continue

                    # 일별 통계 추가
                    if date not in stats['daily_stats']:
                        stats['daily_stats'][date] = {
                            'study_time': 0,
                            'bad_posture_count': 0
                        }

                    stats['total_study_time'] += data['duration']
                    stats['daily_stats'][date]['study_time'] += data['duration']
                    stats['daily_stats'][date]['bad_posture_count'] += data['bad_posture_count']
                    stats['posture_stats']['bad'] += data['bad_posture_count']

        # 평균 학습 시간 계산
        if stats['daily_stats']:
            stats['avg_daily_time'] = stats['total_study_time'] / len(stats['daily_stats'])

        return stats
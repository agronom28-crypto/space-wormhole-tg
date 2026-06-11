from django.urls import path
from .views import SubmitScoreView, LeaderboardView

urlpatterns = [
    path('score/', SubmitScoreView.as_view(), name='submit_score'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
]

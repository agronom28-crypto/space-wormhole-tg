from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='GameSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tg_user_id', models.BigIntegerField(db_index=True)),
                ('tg_username', models.CharField(blank=True, max_length=128)),
                ('inline_message_id', models.CharField(blank=True, max_length=256)),
                ('chat_id', models.BigIntegerField(blank=True, null=True)),
                ('message_id', models.BigIntegerField(blank=True, null=True)),
                ('score', models.IntegerField(default=0)),
                ('level_reached', models.IntegerField(default=0)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={'ordering': ['-score']},
        ),
        migrations.CreateModel(
            name='LeaderboardEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tg_user_id', models.BigIntegerField(db_index=True)),
                ('tg_username', models.CharField(blank=True, max_length=128)),
                ('chat_id', models.BigIntegerField(blank=True, null=True)),
                ('best_score', models.IntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-best_score'], 'unique_together': {('tg_user_id', 'chat_id')}},
        ),
    ]

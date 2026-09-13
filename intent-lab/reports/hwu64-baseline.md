# HWU64 Baseline Methodology Benchmark

Generated: `2026-09-13T05:06:51.863494+00:00`

This report evaluates the classifier methodology against HWU64's native labels. HWU64 labels are not mapped to Family Memory labels and are not production training data.

## Dataset

| Split | Examples | Native labels |
|---|---:|---:|
| train | 8954 | 64 |
| valid | 1076 | 64 |
| test | 1076 | 64 |

## Features

- word TF-IDF n-grams: 1–2;
- character TF-IDF n-grams: 3–5;
- vocabulary and IDF fitted on each training subset only;
- no Family Memory examples or production messages used.

## logistic_regression

Validation accuracy: **0.891**

Test accuracy: **0.858**

Test macro F1: **0.859**

Test weighted F1: **0.859**

Average test maximum probability: **0.469**

Test predictions below 0.70 maximum probability: **956 / 1076**

| Intent | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| `alarm_query` | 0.95 | 0.95 | 0.95 | 19 |
| `alarm_remove` | 0.91 | 0.91 | 0.91 | 11 |
| `alarm_set` | 0.82 | 0.95 | 0.88 | 19 |
| `audio_volume_down` | 1.00 | 1.00 | 1.00 | 8 |
| `audio_volume_mute` | 1.00 | 0.80 | 0.89 | 15 |
| `audio_volume_up` | 0.93 | 1.00 | 0.96 | 13 |
| `calendar_query` | 0.61 | 0.58 | 0.59 | 19 |
| `calendar_remove` | 0.85 | 0.89 | 0.87 | 19 |
| `calendar_set` | 0.94 | 0.79 | 0.86 | 19 |
| `cooking_recipe` | 0.76 | 0.68 | 0.72 | 19 |
| `datetime_convert` | 0.70 | 0.88 | 0.78 | 8 |
| `datetime_query` | 0.74 | 0.89 | 0.81 | 19 |
| `email_addcontact` | 0.73 | 1.00 | 0.84 | 8 |
| `email_query` | 0.88 | 0.79 | 0.83 | 19 |
| `email_querycontact` | 0.92 | 0.63 | 0.75 | 19 |
| `email_sendemail` | 0.80 | 0.84 | 0.82 | 19 |
| `general_affirm` | 1.00 | 1.00 | 1.00 | 19 |
| `general_commandstop` | 1.00 | 1.00 | 1.00 | 19 |
| `general_confirm` | 1.00 | 1.00 | 1.00 | 19 |
| `general_dontcare` | 0.95 | 1.00 | 0.97 | 19 |
| `general_explain` | 1.00 | 1.00 | 1.00 | 19 |
| `general_joke` | 1.00 | 1.00 | 1.00 | 12 |
| `general_negate` | 1.00 | 1.00 | 1.00 | 19 |
| `general_praise` | 0.95 | 1.00 | 0.97 | 19 |
| `general_quirky` | 0.40 | 0.32 | 0.35 | 19 |
| `general_repeat` | 0.95 | 1.00 | 0.97 | 19 |
| `iot_cleaning` | 1.00 | 1.00 | 1.00 | 16 |
| `iot_coffee` | 1.00 | 0.95 | 0.97 | 19 |
| `iot_hue_lightchange` | 0.88 | 0.79 | 0.83 | 19 |
| `iot_hue_lightdim` | 1.00 | 0.92 | 0.96 | 12 |
| `iot_hue_lightoff` | 0.94 | 0.84 | 0.89 | 19 |
| `iot_hue_lighton` | 0.38 | 1.00 | 0.55 | 3 |
| `iot_hue_lightup` | 1.00 | 0.86 | 0.92 | 14 |
| `iot_wemo_off` | 0.82 | 1.00 | 0.90 | 9 |
| `iot_wemo_on` | 0.67 | 0.86 | 0.75 | 7 |
| `lists_createoradd` | 0.71 | 0.79 | 0.75 | 19 |
| `lists_query` | 0.79 | 0.79 | 0.79 | 19 |
| `lists_remove` | 0.86 | 0.95 | 0.90 | 19 |
| `music_likeness` | 0.72 | 0.72 | 0.72 | 18 |
| `music_query` | 0.92 | 0.58 | 0.71 | 19 |
| `music_settings` | 1.00 | 0.86 | 0.92 | 7 |
| `news_query` | 0.73 | 0.58 | 0.65 | 19 |
| `play_audiobook` | 0.95 | 0.95 | 0.95 | 19 |
| `play_game` | 0.81 | 0.68 | 0.74 | 19 |
| `play_music` | 0.59 | 0.68 | 0.63 | 19 |
| `play_podcasts` | 1.00 | 0.84 | 0.91 | 19 |
| `play_radio` | 0.89 | 0.89 | 0.89 | 19 |
| `qa_currency` | 0.95 | 1.00 | 0.97 | 19 |
| `qa_definition` | 0.95 | 0.95 | 0.95 | 19 |
| `qa_factoid` | 0.44 | 0.74 | 0.55 | 19 |
| `qa_maths` | 0.92 | 0.86 | 0.89 | 14 |
| `qa_stock` | 1.00 | 0.95 | 0.97 | 19 |
| `recommendation_events` | 0.81 | 0.89 | 0.85 | 19 |
| `recommendation_locations` | 0.84 | 0.84 | 0.84 | 19 |
| `recommendation_movies` | 0.91 | 1.00 | 0.95 | 10 |
| `social_post` | 0.95 | 0.95 | 0.95 | 19 |
| `social_query` | 0.94 | 0.94 | 0.94 | 18 |
| `takeaway_order` | 0.79 | 0.79 | 0.79 | 19 |
| `takeaway_query` | 0.94 | 0.89 | 0.92 | 19 |
| `transport_query` | 0.75 | 0.79 | 0.77 | 19 |
| `transport_taxi` | 1.00 | 1.00 | 1.00 | 18 |
| `transport_ticket` | 0.94 | 0.84 | 0.89 | 19 |
| `transport_traffic` | 0.90 | 0.95 | 0.92 | 19 |
| `weather_query` | 0.72 | 0.68 | 0.70 | 19 |

### Most common test confusions

| Actual | Predicted | Count |
|---|---|---:|
| `email_query` | `email_sendemail` | 4 |
| `general_quirky` | `qa_factoid` | 4 |
| `news_query` | `qa_factoid` | 4 |
| `cooking_recipe` | `general_quirky` | 3 |
| `email_querycontact` | `qa_factoid` | 3 |
| `play_game` | `play_music` | 3 |
| `play_music` | `music_likeness` | 3 |
| `transport_ticket` | `transport_query` | 3 |
| `calendar_query` | `weather_query` | 2 |
| `calendar_set` | `calendar_remove` | 2 |
| `calendar_set` | `calendar_query` | 2 |
| `datetime_query` | `datetime_convert` | 2 |
| `email_querycontact` | `email_query` | 2 |
| `email_sendemail` | `email_addcontact` | 2 |
| `iot_hue_lightoff` | `iot_wemo_off` | 2 |

## multinomial_naive_bayes

Validation accuracy: **0.860**

Test accuracy: **0.846**

Test macro F1: **0.829**

Test weighted F1: **0.838**

Average test maximum probability: **0.923**

Test predictions below 0.70 maximum probability: **122 / 1076**

| Intent | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| `alarm_query` | 0.90 | 0.95 | 0.92 | 19 |
| `alarm_remove` | 1.00 | 0.73 | 0.84 | 11 |
| `alarm_set` | 0.90 | 0.95 | 0.92 | 19 |
| `audio_volume_down` | 1.00 | 0.88 | 0.93 | 8 |
| `audio_volume_mute` | 1.00 | 0.73 | 0.85 | 15 |
| `audio_volume_up` | 0.76 | 1.00 | 0.87 | 13 |
| `calendar_query` | 0.47 | 0.47 | 0.47 | 19 |
| `calendar_remove` | 0.82 | 0.95 | 0.88 | 19 |
| `calendar_set` | 0.70 | 0.74 | 0.72 | 19 |
| `cooking_recipe` | 1.00 | 0.74 | 0.85 | 19 |
| `datetime_convert` | 0.80 | 1.00 | 0.89 | 8 |
| `datetime_query` | 0.71 | 0.89 | 0.79 | 19 |
| `email_addcontact` | 0.78 | 0.88 | 0.82 | 8 |
| `email_query` | 0.85 | 0.89 | 0.87 | 19 |
| `email_querycontact` | 0.76 | 0.68 | 0.72 | 19 |
| `email_sendemail` | 0.80 | 0.84 | 0.82 | 19 |
| `general_affirm` | 1.00 | 1.00 | 1.00 | 19 |
| `general_commandstop` | 1.00 | 1.00 | 1.00 | 19 |
| `general_confirm` | 0.95 | 1.00 | 0.97 | 19 |
| `general_dontcare` | 0.95 | 1.00 | 0.97 | 19 |
| `general_explain` | 0.90 | 1.00 | 0.95 | 19 |
| `general_joke` | 1.00 | 0.92 | 0.96 | 12 |
| `general_negate` | 1.00 | 1.00 | 1.00 | 19 |
| `general_praise` | 0.95 | 1.00 | 0.97 | 19 |
| `general_quirky` | 0.25 | 0.11 | 0.15 | 19 |
| `general_repeat` | 0.86 | 1.00 | 0.93 | 19 |
| `iot_cleaning` | 1.00 | 1.00 | 1.00 | 16 |
| `iot_coffee` | 0.95 | 1.00 | 0.97 | 19 |
| `iot_hue_lightchange` | 0.85 | 0.89 | 0.87 | 19 |
| `iot_hue_lightdim` | 0.91 | 0.83 | 0.87 | 12 |
| `iot_hue_lightoff` | 0.68 | 0.89 | 0.77 | 19 |
| `iot_hue_lighton` | 0.00 | 0.00 | 0.00 | 3 |
| `iot_hue_lightup` | 1.00 | 0.71 | 0.83 | 14 |
| `iot_wemo_off` | 0.75 | 1.00 | 0.86 | 9 |
| `iot_wemo_on` | 1.00 | 0.71 | 0.83 | 7 |
| `lists_createoradd` | 0.88 | 0.79 | 0.83 | 19 |
| `lists_query` | 0.71 | 0.79 | 0.75 | 19 |
| `lists_remove` | 0.89 | 0.89 | 0.89 | 19 |
| `music_likeness` | 0.74 | 0.78 | 0.76 | 18 |
| `music_query` | 0.86 | 0.63 | 0.73 | 19 |
| `music_settings` | 1.00 | 0.57 | 0.73 | 7 |
| `news_query` | 0.75 | 0.63 | 0.69 | 19 |
| `play_audiobook` | 0.85 | 0.89 | 0.87 | 19 |
| `play_game` | 0.76 | 0.68 | 0.72 | 19 |
| `play_music` | 0.65 | 0.68 | 0.67 | 19 |
| `play_podcasts` | 0.94 | 0.84 | 0.89 | 19 |
| `play_radio` | 0.82 | 0.95 | 0.88 | 19 |
| `qa_currency` | 0.90 | 1.00 | 0.95 | 19 |
| `qa_definition` | 0.95 | 1.00 | 0.97 | 19 |
| `qa_factoid` | 0.67 | 0.32 | 0.43 | 19 |
| `qa_maths` | 0.87 | 0.93 | 0.90 | 14 |
| `qa_stock` | 0.86 | 1.00 | 0.93 | 19 |
| `recommendation_events` | 0.75 | 0.95 | 0.84 | 19 |
| `recommendation_locations` | 0.77 | 0.89 | 0.83 | 19 |
| `recommendation_movies` | 0.80 | 0.80 | 0.80 | 10 |
| `social_post` | 1.00 | 0.89 | 0.94 | 19 |
| `social_query` | 0.89 | 0.94 | 0.92 | 18 |
| `takeaway_order` | 0.88 | 0.79 | 0.83 | 19 |
| `takeaway_query` | 0.89 | 0.89 | 0.89 | 19 |
| `transport_query` | 0.70 | 0.74 | 0.72 | 19 |
| `transport_taxi` | 1.00 | 1.00 | 1.00 | 18 |
| `transport_ticket` | 0.89 | 0.89 | 0.89 | 19 |
| `transport_traffic` | 0.86 | 1.00 | 0.93 | 19 |
| `weather_query` | 0.79 | 0.79 | 0.79 | 19 |

### Most common test confusions

| Actual | Predicted | Count |
|---|---|---:|
| `calendar_set` | `calendar_query` | 4 |
| `calendar_query` | `lists_query` | 3 |
| `cooking_recipe` | `general_quirky` | 3 |
| `iot_hue_lighton` | `iot_hue_lightoff` | 3 |
| `qa_factoid` | `datetime_query` | 3 |
| `alarm_remove` | `calendar_remove` | 2 |
| `audio_volume_mute` | `calendar_set` | 2 |
| `email_query` | `email_sendemail` | 2 |
| `general_quirky` | `qa_currency` | 2 |
| `general_quirky` | `general_explain` | 2 |
| `iot_hue_lightoff` | `iot_wemo_off` | 2 |
| `iot_hue_lightup` | `iot_hue_lightchange` | 2 |
| `lists_createoradd` | `lists_query` | 2 |
| `music_query` | `email_querycontact` | 2 |
| `music_query` | `play_music` | 2 |

## Few-shot test accuracy

Each k-shot model uses the first k examples per native HWU64 label from the training split. This is a deterministic methodology comparison, not a production model selection exercise.

| Shots per label | Logistic regression | Naive Bayes |
|---:|---:|---:|
| 1 | 0.307 | 0.318 |
| 5 | 0.571 | 0.559 |
| 10 | 0.656 | 0.654 |
| 25 | 0.772 | 0.760 |

## Interpretation

These results measure general intent-classification methodology on a public personal-assistant benchmark. They do not establish that the model understands Family Memory capabilities, sensitive health language, patient/delegate relationships, or permission rules. Any future production classifier remains advisory and must pass deterministic request construction, identity resolution, validation, and authorization.

# OCR 응답 계약

배포된 OpenAPI 기준으로 기존 임시 `ocr_prediction` 계약은 사용하지 않습니다.

- 목록 게시글 단위 `is_ocr_drug`: boolean 판정. `true`는 양성, `false`는 음성, `null`·누락은 미제공입니다. 백엔드 추가 예정 계약이며 존재 여부로 추정하지 않습니다.
- 목록: `image_ai_results[].has_ocr_text`는 OCR 텍스트 존재 여부입니다. 양성·음성을 의미하지 않습니다.
- 상세·단순 분석: `image_ai_results[].ocr_text_results[]`에서 문구별 `ocr_text`, `prediction`, `ocr_text_score`, `matched_terms`, `matched_intents`를 읽습니다.
- `prediction: null`은 미제공으로 유지하고 `source`가 있으면 미제공 사유를 표시합니다.
- OCR 배열이 생략되면 빈 배열로 처리합니다. 존재 여부나 점수로 양성 판정을 만들지 않습니다.
- 종합 판정 `is_drug`는 서버 응답 그대로 유지합니다.

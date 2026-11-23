# OCR 판정 임시 응답 규격

프론트엔드에서 먼저 정한 임시 규격입니다. 백엔드에서 이미 제공되는 필드라는 뜻은 아닙니다.

`GET /detections`의 각 게시글 항목에 `ocr_prediction`을 추가합니다.

```json
[
  {
    "id": "example-id",
    "content": "게시글 본문",
    "is_drug": true,
    "ocr_prediction": 1
  }
]
```

- `1`: OCR 양성
- `0`: OCR 음성
- `null` 또는 필드 누락: 판정 미제공
- 여러 이미지의 OCR 중 하나라도 양성이면 게시글 단위 `ocr_prediction`은 `1`입니다.
- 텍스트 추출 여부나 OCR 점수로 양성을 추정하지 않습니다.
- 기존 종합 판정 `is_drug`는 서버 값 그대로 사용합니다. OCR 필터가 종합 판정을 변경하지 않습니다.
- 규격 확정 시 `src/lib/detections-api.ts`의 `ocrFlagged` 매핑을 수정하면 됩니다.

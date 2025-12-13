# Firebase Firestore 보안 규칙 수정 가이드

## 문제 상황
admin.html 페이지에서 "데이터를 불러오는 중..." 상태로 멈춰있는 경우, Firestore 보안 규칙 문제일 가능성이 높습니다.

## 해결 방법

### 1. Firebase 콘솔 접속
1. https://console.firebase.google.com 접속
2. 프로젝트 `j22j22` 선택
3. 왼쪽 메뉴에서 **Firestore Database** 클릭
4. 상단 탭에서 **규칙** (Rules) 클릭

### 2. 현재 보안 규칙 확인
현재 규칙이 다음과 같다면 문제입니다:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. 수정된 보안 규칙 (어드민 접근 허용)

다음 규칙으로 변경하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 어드민 이메일 확인 함수
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email == 'jjiyu244@gmail.com';
    }
    
    // userStakes 컬렉션
    match /userStakes/{userId} {
      // 본인 데이터는 읽기/쓰기 가능
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // 어드민은 모든 데이터 읽기 가능
      allow read: if isAdmin();
    }
    
    // rewards 컬렉션
    match /rewards/{rewardId} {
      // 본인 리워드는 읽기 가능
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.userId;
      // 어드민은 모든 리워드 읽기/쓰기 가능
      allow read, write: if isAdmin();
    }
    
    // inquiries 컬렉션
    match /inquiries/{inquiryId} {
      // 본인 문의는 읽기 가능
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.userId;
      // 어드민은 모든 문의 읽기 가능
      allow read: if isAdmin();
      // 로그인한 사용자는 문의 작성 가능
      allow create: if request.auth != null;
    }
    
    // 기타 문서는 로그인한 사용자만 접근
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. 규칙 저장 및 배포
1. 위 규칙을 복사하여 Firebase 콘솔의 규칙 편집기에 붙여넣기
2. **게시** (Publish) 버튼 클릭
3. 몇 초 후 규칙이 적용됩니다

### 5. 추가 확인 사항

#### Firestore 인덱스 생성 (선택사항)
리워드 데이터 로드 시 인덱스 오류가 발생한다면:

1. Firebase 콘솔 > Firestore Database > **인덱스** 탭
2. 오류 메시지에 포함된 링크를 클릭하거나
3. 다음 복합 인덱스 생성:
   - 컬렉션: `rewards`
   - 필드:
     - `userId` (오름차순)
     - `approvedAt` (내림차순)
   - **인덱스 생성** 클릭

### 6. 테스트 방법
1. 브라우저 콘솔 열기 (F12)
2. admin.html 페이지 접속
3. 관리자 계정으로 로그인
4. 콘솔에서 오류 메시지 확인:
   - `Permission denied` 오류가 있다면 보안 규칙 문제
   - `Missing or insufficient permissions` 오류도 보안 규칙 문제

### 7. 디버깅 팁
- 브라우저 콘솔에서 `window.db` 확인
- `loadAllUserStakes()` 함수 직접 호출 테스트
- Firebase 콘솔 > Firestore Database > 데이터 탭에서 실제 데이터 존재 확인

## 주의사항
- 보안 규칙 변경 후 즉시 적용되지만, 캐시 때문에 최대 1분 정도 걸릴 수 있습니다
- 프로덕션 환경에서는 더 엄격한 규칙을 적용하는 것을 권장합니다
- 어드민 이메일이 변경되면 규칙도 함께 수정해야 합니다


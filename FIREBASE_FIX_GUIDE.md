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
    
    // stake 컬렉션 (개별 스테이킹 거래)
    match /stake/{stakeId} {
      // 본인 스테이킹 거래는 읽기 가능
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.user_uid;
      // 어드민은 모든 스테이킹 거래 읽기 가능
      allow read: if isAdmin();
      // 로그인한 사용자는 자신의 스테이킹 거래 작성 가능
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.user_uid;
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

### 5. Firestore 인덱스 생성 (필수)

리워드 데이터 로드 시 인덱스 오류가 발생합니다. 다음 인덱스를 생성해야 합니다:

#### 방법 1: 오류 메시지 링크 사용 (가장 쉬운 방법)
1. 브라우저 콘솔에 표시된 오류 메시지에서 링크를 클릭
2. 또는 다음 URL로 직접 이동:
   ```
   https://console.firebase.google.com/v1/r/project/j22j22/firestore/indexes?create_composite=CkZwcm9qZWN0cy9qMjJqMjIvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Jld2FyZHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDgoKYXBwcm92ZWRBdBACGgwKCF9fbmFtZV9fEAI
   ```
3. **인덱스 생성** 버튼 클릭
4. 인덱스가 생성될 때까지 대기 (보통 1-5분 소요)
5. 상태가 "사용 가능"으로 변경되면 완료

#### 방법 2: 수동으로 인덱스 생성
1. Firebase 콘솔 > Firestore Database > **인덱스** 탭 클릭
2. **복합 인덱스 만들기** 버튼 클릭
3. 다음 정보 입력:
   - **컬렉션 ID**: `rewards`
   - **쿼리 범위**: 컬렉션
   - **필드 추가**:
     - 필드 1: `userId` → 정렬: 오름차순 (Ascending)
     - 필드 2: `approvedAt` → 정렬: 내림차순 (Descending)
     - 필드 3: `__name__` → 정렬: 내림차순 (Descending) - 자동 추가됨
4. **만들기** 버튼 클릭
5. 인덱스 생성 완료까지 대기 (상태가 "생성 중..." → "사용 가능"으로 변경)

### 6. 확인 사항 체크리스트

다음 항목들을 순서대로 확인하세요:

#### ✅ 1단계: Firestore 보안 규칙 확인
- [ ] Firebase 콘솔 > Firestore Database > **규칙** 탭
- [ ] `isAdmin()` 함수가 `jjiyu244@gmail.com`을 확인하는지
- [ ] `userStakes` 컬렉션에 `allow read: if isAdmin();` 규칙이 있는지
- [ ] **게시** 버튼을 눌러 규칙을 저장했는지

#### ✅ 2단계: Firestore 인덱스 확인
- [ ] Firebase 콘솔 > Firestore Database > **인덱스** 탭
- [ ] `rewards` 컬렉션에 대한 복합 인덱스가 있는지 확인
- [ ] 인덱스 상태가 "사용 가능"인지 확인 (아직 "생성 중..."이면 대기)
- [ ] 인덱스 필드: `userId` (오름차순), `approvedAt` (내림차순), `__name__` (내림차순)

#### ✅ 3단계: 데이터 확인
- [ ] Firebase 콘솔 > Firestore Database > **데이터** 탭
- [ ] `userStakes` 컬렉션에 데이터가 있는지 확인
- [ ] `stake` 컬렉션에 데이터가 있는지 확인 (중요!)
- [ ] `stake` 컬렉션의 문서에 `user_uid` 필드가 있는지 확인
- [ ] 데이터가 없다면 정상 (회원이 스테이킹을 시작하면 생성됨)

### 7. 테스트 방법
1. 브라우저 콘솔 열기 (F12)
2. admin.html 페이지 접속
3. 관리자 계정(`jjiyu244@gmail.com`)으로 로그인
4. 콘솔에서 오류 메시지 확인:
   - `Permission denied` 또는 `Missing or insufficient permissions` → 보안 규칙 문제
   - `The query requires an index` → 인덱스 생성 필요 (아직 생성 중일 수 있음)
   - `로드된 사용자 수: 0` → 데이터가 없거나 보안 규칙 문제

### 8. 디버깅 팁
- 브라우저 콘솔에서 `window.db` 확인
- `loadAllUserStakes()` 함수 직접 호출 테스트
- Firebase 콘솔 > Firestore Database > 데이터 탭에서 실제 데이터 존재 확인
- 인덱스 생성은 시간이 걸릴 수 있으므로 (1-5분) 인내심을 가지세요
- 인덱스가 생성 중이면 "생성 중..." 상태로 표시되며, 완료되면 "사용 가능"으로 변경됩니다

## 주의사항
- 보안 규칙 변경 후 즉시 적용되지만, 캐시 때문에 최대 1분 정도 걸릴 수 있습니다
- 프로덕션 환경에서는 더 엄격한 규칙을 적용하는 것을 권장합니다
- 어드민 이메일이 변경되면 규칙도 함께 수정해야 합니다


# 관리자 권한 문제 진단 및 해결 가이드

## 🔍 발견된 문제점

### 1. **Firestore 문서 ID와 Firebase Auth UID 불일치 문제** ⚠️ (가장 중요)
   - **문제**: Firestore의 `users` 컬렉션 문서 ID가 Firebase Auth의 UID와 일치해야 합니다.
   - **현재 상황**: 
     - 스크린샷에서 본 문서 ID: `xTGcq2MVOPOAa8UYIeVieibEPot1`
     - 이 문서 ID가 실제 로그인한 계정의 Firebase Auth UID와 일치하는지 확인 필요
   - **해결 방법**: 아래 "해야 할 일" 참조

### 2. **코드 수정 완료된 부분** ✅
   - `onAuthStateChanged`에서 Firestore `role` 필드 확인 기능 추가
   - 로그인 함수에서 Firestore `role` 필드 확인 기능 추가
   - `db` 변수 스코프 문제 수정

### 3. **확인이 필요한 부분** ❓
   - 실제 로그인 계정의 Firebase Auth UID 확인
   - Firestore 문서의 `role` 필드 값 정확성 (대소문자, 따옴표 등)

## 📋 사용자가 해야 할 일

### 방법 1: 진단 도구 사용 (권장)

1. **진단 도구 실행**:
   - `debug-admin.html` 파일을 브라우저에서 열기
   - 또는 로컬 서버: `http://localhost:8000/debug-admin.html`

2. **로그인**:
   - `jjiyu1@corestaker.local` 계정으로 로그인

3. **진단 실행**:
   - "진단 시작" 버튼 클릭
   - 결과 확인

4. **자동 수정**:
   - "Firestore 문서 수정" 버튼 클릭
   - 페이지 새로고침

### 방법 2: Firebase Console에서 직접 확인/수정

1. **Firebase Console 접속**:
   - https://console.firebase.google.com
   - 프로젝트: `j22j22` 선택

2. **Authentication에서 UID 확인**:
   - Authentication → Users
   - `jjiyu1@corestaker.local` 계정 찾기
   - **UID 복사** (예: `abc123xyz...`)

3. **Firestore에서 문서 확인**:
   - Firestore Database → `users` 컬렉션
   - 문서 ID가 위에서 복사한 **UID와 일치**하는지 확인
   - **일치하지 않으면**: 새로운 문서를 UID로 생성하거나 기존 문서 ID를 UID로 변경

4. **문서 수정**:
   - 올바른 문서 (UID와 일치하는 문서) 선택
   - 필드 확인:
     - `role`: `"admin"` (따옴표 포함, 소문자)
     - `email`: `"jjiyu1@corestaker.local"`
     - `username`: `"jjiyu1"`

### 방법 3: 브라우저 콘솔에서 직접 수정

1. `jjiyu1@corestaker.local` 계정으로 로그인

2. 브라우저 개발자 도구(F12) → Console 탭

3. 아래 코드 실행:

```javascript
(async function() {
  const { getFirestore, doc, getDoc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
  
  const auth = window.__firebase?.auth || getAuth();
  const db = window.__firebase?.db || getFirestore();
  
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ 로그인하지 않았습니다.');
    return;
  }
  
  console.log('✅ 현재 사용자:', user.email, 'UID:', user.uid);
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    await updateDoc(userRef, {
      role: 'admin',
      email: user.email,
      username: 'jjiyu1'
    });
    console.log('✅ 문서 업데이트 완료! role: admin');
  } else {
    await setDoc(userRef, {
      email: user.email,
      username: 'jjiyu1',
      role: 'admin',
      createdAt: new Date()
    });
    console.log('✅ 새 문서 생성 완료! role: admin');
  }
  
  console.log('🔄 페이지를 새로고침하세요.');
})();
```

## 🔧 코드 수정 완료 내용

1. ✅ `onAuthStateChanged`에서 Firestore `role` 필드 확인 추가
2. ✅ 로그인 함수에서 Firestore `role` 필드 확인 추가  
3. ✅ `db` 변수 스코프 문제 수정

## ⚠️ 주의사항

1. **문서 ID는 반드시 Firebase Auth UID와 일치해야 합니다**
   - 예: UID가 `abc123`이면 Firestore 문서 ID도 `abc123`이어야 함
   - 문서 ID가 다르면 관리자 권한이 인정되지 않습니다

2. **role 필드는 정확히 `"admin"` (문자열)이어야 합니다**
   - 대소문자 구분: `"admin"` ✅, `"Admin"` ❌, `"ADMIN"` ❌
   - 따옴표 포함: 문자열로 저장되어야 함

3. **브라우저 캐시 클리어**
   - 수정 후 페이지를 강제 새로고침 (Ctrl + Shift + R)
   - 또는 브라우저 캐시 삭제

## 📊 관리자 체크 로직

현재 관리자는 다음 중 하나를 만족하면 됩니다:

1. Firestore `users/{uid}` 문서의 `role` 필드가 `"admin"`
2. Firestore `users/{uid}` 문서의 `username` 필드가 `"jjiyu244"`
3. 이메일이 다음 중 하나:
   - `jjiyu244@corestaker.local`
   - `jjiyu244@temp.com`
   - `jjiyu244@gmail.com`

**`jjiyu1@corestaker.local` 계정의 경우**: 1번 조건 (`role: 'admin'`)을 만족해야 합니다.

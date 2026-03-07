# Thread is a simple chat thread.

- 스레드는 하나의 배열로만 되어 있음.
- 스레드는 OpenAI 메시지로 복원이 가능해야하고, 역도 성립해야함.
- 스레드는 '화면에 표시되는 메시지 순서' 를 그대로 유지함.

여기서 변환/복원은 OpenAI 메시지를 순차적으로 읽으면 스레드 메시지로 복원 되고, 반대로도 순차적으로 누적하면 원본 메시지가 된다는 것
스트리밍하면 가장 마지막 메시지에 누적되는 방식임.

## Thread

```ts
export type Thread = {
  id: string;
  title: string;

  host?: string; // 어떤 호스트에서 실행하고 있었는지, 기본은 로컬, 추후에 websocket 확장이 되면 그것도 저장
  permissions: ... // 권한 정보, 예를 들어서 이런 스크립트는 실행 허용이다, 이런 도구는 사용 불가다, 등등이 저장될 것임.

  sections: ThreadSection[]; // 스레드는 여러 섹션으로 나뉘어질 수 있음. 예를 들어서, 시스템 메시지 섹션, 사용자 메시지 섹션, 도구 메시지 섹션 등등으로 나뉘어질 수 있음.
}

export type ThreadSection = {
	id: string;
	label: string; // 섹션의 이름인데, 사실상 요약임.
	messages: ThreadMessage[]; // 섹션은 여러 메시지로 나뉘어질 수 있음. 예를 들어서, 시스템 메시지 섹션에는 시스템 메시지가 여러 개 있을 수 있음.
}
```

Thread host 는 고정임. 현재 접속한 host 가 thread 와 다르면 대화를 이어나가지는 못하고 읽기전용이 됨.

## 메시지 종류

### 유저 텍스트 메시지

- type: user_text
- 유저가 입력한 '일반적인' 메시지.
- jsdown 형식 (markdown 인데 중간에 `${}` 를 넣어서 코드 실행은 가능)
- raw 와 rendered 를 저장함. 실제로 사용되는건 rendered, raw 는 혹시 필요할 떄 사용

### 유저 이미지 메시지

- type: user_image
- image path 를 저장 (host 상의 path 를 사용하게 됨)

### 유저 커맨드

- type: user_command
- `/` prefix 로 시작한 경우. 이 경우 대부분 시스템에서 동작이 있어 핸들링이 됨.
- OpenAI 등에 넘길 때는 무시되지만, 화면에 표시

### 유저 히든 메시지

- type: user_hidden
- `//` 으로 시작한 경우. 이 경우에는 사용자 화면에만 표시되고 사실상 무시됨. 노트 같은 역할.

### 유저 에이전틱 메시지

- type: user_agentic
- `!` 으로 시작한 경우. 이후에 목표가 나옴. AI Agent Loop 가 동작하기 시작함.

### 시스템 알림

- type: system_noti
- 위의 user_command 등으로 인해 생긴 메시지이며, OpenAI 등에는 넘겨지지 않음. 화면에만 표시.

### ai 메시지

- type: ai_text
- ai 가 생성한 텍스트 메시지. 일단 markdown 으로 렌더링 될 것임.

### ai 이미지 메시지

- type: ai_image
- 사용될지는 모르겠지만 이미지 생성을 한다면 image path (host 의 path 사용))

### ai 도구 메시지

- type: ai_tool
- OpenAI Function Calling 과 비슷한 방식
- name: string, arg: JSONValue 형식임.
- id: string 도 저장. 이건 OpenAI 에 필요함.
- 추가적인 필드로 result 필드 (object) 가 있는데,
    - approved: boolean, 이건 도구 실행이 승인되었는지 여부.
    - result: string 도구 실행결과 raw string 임.
    - meta: object 도구와 관련된 부가 정보. AI 에게 전달되는건 아니고, 사람이 보는 정보.

### 에이전트 시스템 메시지

- type: agent_system
- 에이전트 시스템 메시지는 로직상 Agentic loop 를 만들기 위해 자동으로 주입되는 메시지임.
- content: '목표를 달성하였는가?', '플랜을 세워라' 같은 식의 명령이 들어감.

### Compacted

- type: compacted
- Compaction 등으로 과거 대화 요약을 전달하는 메시지.

## 참고 필드명

필드명은 가능하면 이른 느낌으로 지어야 함.

- type: 메시지든 무엇이든 타입
- id: 고유 식별자
- text: Text 기반 값인 경우. string 이 들어가야 함. OpenAI Message 등에 그냥 그대로 쓰면 되는 값
- rawText: 만약에 text 가 가공되어 나온 값이 경우 원본. 미사용이고 참고용임.
- imgPath: image file 이 저장된 path 임.

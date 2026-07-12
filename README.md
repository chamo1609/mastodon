## About

카모마일 에디션은 마스토돈을 기반으로 **자작 캐릭터(OC) 교류 커뮤니티 운영**을 위해 제작된 **오픈소스 에디션**입니다. 한국어 사용자의 독립적인 운영을 위한 에디션으로, 커뮤니티를 위한 여러 편의 기능을 추가하였습니다.

이 프로젝트는 일부 개발 과정에서 AI 기반 도구를 활용하여 바이브 코딩으로 제작되었습니다.

## Navigation

- [Project homepage 🐘](https://joinmastodon.org)
- [Mastodon Bird-UI](https://github.com/ronilaukkarinen/mastodon-bird-ui/)
- [CHAMOMILE 블로그](https://www.postype.com/@chamomile)

## Features

마스토돈과 차별화되는 **카모마일 에디션**의 특징은 다음과 같습니다:

### 편의 기능

- 고급 검색: Elastic Search를 활성화하거나 비활성화할 수 있습니다.
- 게시판 기능: 해시태그를 활용한 독립적인 게시판을 관리자 페이지에서 추가하고 제거할 수 있습니다.
- 툿 작성 계정 전환: 다른 계정의 api 토큰을 저장하여 로그아웃 및 로그인 과정 없이 여러 계정에서 툿을 작성할 수 있습니다.
- 주사위: `[[nDm]]`의 형식으로 1과 m 사이의 자연수를 랜덤으로 n개 뽑아 합을 출력하는 주사위 기능을 추가할 수 있습니다.
- 게시글의 공개 범위와 관계 없이 답글이 툿 하단의 답글 개수에 포함됩니다.
- 계정의 미디어 미리보기 타임라인에서 썸네일을 클릭 시, 해당 미디어가 첨부된 게시글로 이동합니다.
- 북마크 폴더: 북마크 폴더를 만들어 여러 개의 북마크를 관리할 수 있습니다.

### 프라이버시

- 로그인하지 않은 방문자에게 인스턴스의 툿, 프로필 등을 보이지 않습니다.
- 관리자를 포함하지 않은 DM 작성이 불가능하도록 설정할 수 있습니다.
- 모든 가입자의 초기 이메일 알림 설정을 꺼 둡니다.

### 디스플레이

- 마크다운: 관리자는 자신의 서버의 이용자들이 마크다운 기능을 사용할 수 있도록 허용하거나, 허용하지 않을 수 있습니다.
- 채팅방 UI: 공개 범위가 direct인 타래를 하나의 페이지에 모아 채팅방 형식으로 확인할 수 있습니다.
- 관리자가 동적으로 테마 컬러, 배경 이미지, 워드마크 로고 등을 변경하여 커뮤니티 커스텀 테마 설정이 가능합니다.
- 자캐 커뮤니티에 적합하도록 탐색하기, 트렌드 등의 메뉴를 삭제하여 내비게이션 패널을 최적화하였습니다.

## Deployment

[마스토돈 홈페이지 설치 가이드](https://docs.joinmastodon.org/admin/install/) 또는 [카모마일 에디션 설치 가이드](https://www.postype.com/@chamomile/todo)를 참고하여 설치할 수 있습니다.

### Tech stack

- [Ruby on Rails](https://github.com/rails/rails) powers the REST API and other web pages.
- [PostgreSQL](https://www.postgresql.org/) is the main database.
- [Redis](https://redis.io/) and [Sidekiq](https://sidekiq.org/) are used for caching and queueing.
- [Node.js](https://nodejs.org/) powers the streaming API.
- [React.js](https://reactjs.org/) and [Redux](https://redux.js.org/) are used for the dynamic parts of the interface.
- [BrowserStack](https://www.browserstack.com/) supports testing on real devices and browsers. (This project is tested with BrowserStack)
- [Chromatic](https://www.chromatic.com/) provides visual regression testing. (This project is tested with Chromatic)

### Requirements

- **Ruby** 3.3+
- **PostgreSQL** 14+
- **Redis** 7.0+
- **Node.js** 22+
- **FFmpeg** 5.1+

위는 배포 당시의 사양으로, 마스토돈 v4.6.3을 기반으로 합니다.

This repository includes deployment configurations for **Docker and docker-compose**, as well as for other environments like Heroku and Scalingo. For Helm charts, reference the [mastodon/chart repository](https://github.com/mastodon/chart). A [**standalone** installation guide](https://docs.joinmastodon.org/admin/install/) is available in the main documentation.

## Contributing

카모마일 에디션의 기반이 되는 마스토돈 및 카모마일 에디션은 **AGPLv3** 라이선스를 따르는 **오픈소스 소프트웨어**입니다.

자유로운 수정, 기능의 추가 및 제거가 가능하며, 이를 기반으로 한 파생 프로젝트 역시 라이선스에 따라 동일한 AGPLv3 라이선스로 공개되어야 합니다.

## LICENSE

Copyright (c) 2016-2025 Eugen Rochko (+ [`mastodon authors`](AUTHORS.md))

Licensed under GNU Affero General Public License as stated in the [LICENSE](LICENSE):

```text
Copyright (c) 2016-2025 Eugen Rochko & other Mastodon contributors

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see https://www.gnu.org/licenses/
```

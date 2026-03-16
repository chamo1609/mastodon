#!/bin/bash

echo "========================================"
echo " Chamomile Edition Server Manager"
echo "========================================"

# 1. 윈도우 줄바꿈(CRLF) 방어 및 설정값 읽기
# tr -d '\r' 를 추가하여 윈도우 메모장에서 수정하더라도 오류가 나지 않도록 완벽히 방어합니다.
ES_ENABLED=$(grep "elasticsearch_enabled:" config/chamomile_mealkit.yml | sed 's/.*:[[:space:]]*//' | tr -d '\r' | tr -d ' "')

if [ "$ES_ENABLED" == "true" ]; then
  echo "[상태] 검색 엔진(Elasticsearch) 모드가 활성화되어 있습니다."

  # 2. 리눅스 커널 메모리 설정 자동 확인 및 적용
  CURRENT_MAP_COUNT=$(cat /proc/sys/vm/max_map_count)
  REQUIRED_MAP_COUNT=262144

  if [ "$CURRENT_MAP_COUNT" -lt "$REQUIRED_MAP_COUNT" ]; then
    echo "[알림] 검색 엔진 실행을 위해 서버의 메모리 설정을 최적화합니다."
    echo "[안내] 관리자 비밀번호를 요구할 수 있습니다."
    sudo sysctl -w vm.max_map_count=$REQUIRED_MAP_COUNT
  fi

  # 3. 서버 실행 (검색 엔진 포함)
  echo "[진행] 서버 컨테이너를 시작합니다..."
  docker compose --profile search up -d

  # 4. 지능형 초기 인덱싱 (최초 1회만 자동 실행)
  # .es_initialized 라는 숨김 파일이 있는지 확인하고, 없다면 처음 설치한 것으로 간주합니다.
  if [ ! -f ".es_initialized" ]; then
    echo "========================================"
    echo "[초기 설정] 검색 엔진에 데이터를 처음으로 동기화합니다."
    echo "[안내] 서버가 완전히 켜질 때까지 20초 정도 대기합니다..."
    sleep 20
    
    echo "[진행] 데이터를 동기화하는 중입니다. 잠시만 기다려주십시오..."
    # -T 옵션은 자동화 스크립트에서 터미널 화면 오류 없이 실행하기 위해 필수입니다.
    docker compose exec -T web bin/tootctl search deploy
    
    # 완료 후 플래그(이정표) 파일 생성. 다음 서버 재시작부터는 이 과정을 건너뜁니다.
    touch .es_initialized
    echo "[완료] 검색 데이터 초기 동기화가 끝났습니다!"
  fi

else
  echo "[상태] 기본 모드(검색 엔진 꺼짐)로 시작합니다. (RAM 절약)"
  
  # 기존에 켜져 있던 검색 엔진이 있다면 강제로 끕니다.
  docker compose --profile search stop es 2>/dev/null
  
  # 검색 엔진을 제외한 기본 서버만 실행합니다.
  docker compose up -d
fi

echo "========================================"
echo " 모든 설정이 완료되었습니다. 서버가 가동 중입니다."
echo "========================================"
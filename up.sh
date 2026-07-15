#!/bin/bash

# 0. 배포 시 .env.production으로 변경
ENV_FILE=".env.production"
GUIDE="https://postype.com/@chamomile/todo"

echo "========================================"
echo " 카모마일 에디션 설치 매니저"
echo " 설치 가이드: $GUIDE"
echo "========================================"

# 1. .env.production 존재 여부 체크
if [ ! -f "$ENV_FILE" ]; then
  echo "설정 파일($ENV_FILE)을 찾을 수 없습니다."
  echo "----------------------------------------"
  echo "카모마일 에디션 설치 가이드: $GUIDE"
  echo "----------------------------------------"
  exit 1
fi

# 2. 사용자에게 Elasticsearch 활성화 여부 묻기
while true; do
  read -p "고급 검색 엔진(Elasticsearch)을 활성화하시겠습니까? (y/n): " yn
  case $yn in
    [Yy]* ) 
      ES_ENABLED="true"
      sed -i 's/^ES_ENABLED=.*/ES_ENABLED=true/' "$ENV_FILE"
      break;;
    [Nn]* ) 
      ES_ENABLED="false"
      sed -i 's/^ES_ENABLED=.*/ES_ENABLED=false/' "$ENV_FILE"
      break;;
    * ) echo "y 또는 n을 입력해 주십시오.";;
  esac
done

# 2. 데이터베이스 마이그레이션 (공통 필수 과정)
echo "데이터베이스 마이그레이션을 확인하고 최신화합니다..."
docker compose run --rm web bundle exec rails db:migrate

if [ "$ES_ENABLED" == "true" ]; then
  echo "검색 엔진(Elasticsearch)이 활성화되었습니다."

  # 3. 리눅스 커널 가상 메모리 설정 자동 확인 및 적용
  CURRENT_MAP_COUNT=$(cat /proc/sys/vm/max_map_count 2>/dev/null || echo 0)
  REQUIRED_MAP_COUNT=262144

  if [ "$CURRENT_MAP_COUNT" -lt "$REQUIRED_MAP_COUNT" ]; then
    echo "검색 엔진 실행을 위해 서버의 가상 메모리 설정을 최적화합니다."
    echo "권한 상승을 위해 관리자(sudo) 비밀번호를 요구할 수 있습니다."
    sudo sysctl -w vm.max_map_count=$REQUIRED_MAP_COUNT
  fi

  # 4. Elasticsearch 볼륨 폴더 권한 문제 사전 방지 (에러 원천 차단)
  echo "검색 엔진 데이터 폴더의 쓰기 권한을 설정합니다..."
  mkdir -p ./elasticsearch
  sudo chown -R 1000:1000 ./elasticsearch

  # 5. 서버 실행 (검색 엔진 포함)
  # 검색 엔진용 프로필을 활성화하여 컨테이너를 올립니다.
  echo "서버 컨테이너를 시작합니다..."
  docker compose --profile search up -d

  # 6. 지능형 초기 인덱싱 (최초 1회만 자동 실행)
  if [ ! -f ".es_initialized" ]; then
    echo "========================================"
    echo "초기 설정: 검색 엔진에 데이터를 처음으로 동기화합니다."
    echo "검색 엔진이 완전히 켜질 때까지 30초 대기합니다..."
    sleep 30
    
    echo "데이터를 동기화하는 중입니다. 데이터 양에 따라 시간이 소요될 수 있습니다..."
    # -T 옵션: 자동화 스크립트에서 터미널 화면 오류 없이 실행하기 위해 필수
    docker compose exec -T web bin/tootctl search deploy
    
    # 완료 후 플래그(이정표) 파일 생성
    touch .es_initialized
    echo "검색 데이터 초기 동기화가 끝났습니다."
  fi

else
  echo "검색 엔진을 비활성화하여 시작합니다. (RAM 절약)"
  
  # 기존에 켜져 있던 검색 엔진이 있다면 강제로 끕니다.
  docker compose --profile search stop es 2>/dev/null
  
  # 검색 엔진을 제외한 기본 서버만 실행합니다.
  docker compose up -d
fi

echo "========================================"
echo " 모든 설정이 완료되었습니다. 서버가 가동 중입니다."
echo "========================================"
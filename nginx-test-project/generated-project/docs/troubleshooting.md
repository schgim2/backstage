# Troubleshooting Guide

이 가이드는 nginx-test-service 서비스에서 발생할 수 있는 일반적인 문제와 해결 방법을 제공합니다.

## 일반적인 문제

### 1. 서비스 시작 실패

#### 증상
- 컨테이너가 시작되지 않음
- Pod가 CrashLoopBackOff 상태

#### 원인 및 해결방법

**포트 충돌**
```bash
# 포트 사용 확인
netstat -tulpn | grep :8082
lsof -i :8082

# 해결: 다른 포트 사용 또는 기존 프로세스 종료
sudo kill -9 <PID>
```

**NGINX 설정 오류**
```bash
# 설정 파일 문법 검사
nginx -t -c /path/to/nginx.conf

# Docker에서 설정 검사
docker run --rm -v $PWD/config:/etc/nginx/conf.d nginx:1.25 nginx -t

# 일반적인 설정 오류
# 1. 세미콜론 누락
# 2. 중괄호 불일치
# 3. 잘못된 지시어 사용
```

**권한 문제**
```bash
# 파일 권한 확인
ls -la config/
ls -la html/

# 권한 수정
chmod 644 config/*.conf
chmod -R 644 html/
```

### 2. 연결 문제

#### 증상
- 브라우저에서 접속 불가
- "Connection refused" 오류

#### 해결방법

**서비스 상태 확인**
```bash
# Docker Compose
docker-compose ps
docker-compose logs nginx

# Kubernetes
kubectl get pods -n ${{ values.namespace }}
kubectl logs deployment/${{ values.name }} -n ${{ values.namespace }}
kubectl describe pod <pod-name> -n ${{ values.namespace }}
```

**네트워크 연결 테스트**
```bash
# 로컬 연결 테스트
curl -I http://localhost:8082

# 컨테이너 내부에서 테스트
docker exec -it <container-name> curl -I http://localhost:80

# Kubernetes 포트 포워딩
kubectl port-forward svc/${{ values.name }} ${{ values.port }}:80 -n ${{ values.namespace }}
```

**방화벽 확인**
```bash
# iptables 규칙 확인
sudo iptables -L

# UFW 상태 확인 (Ubuntu)
sudo ufw status

# 포트 열기
sudo ufw allow ${{ values.port }}
```

### 3. SSL/TLS 문제

{% if values.enableSSL %}
#### 증상
- SSL 인증서 오류
- "Your connection is not private" 경고

#### 해결방법

**인증서 상태 확인**
```bash
# 인증서 정보 확인
openssl x509 -in /path/to/certificate.crt -text -noout

# 인증서 만료일 확인
openssl x509 -in /path/to/certificate.crt -noout -dates

# 온라인 SSL 테스트
curl -vI https://${{ values.domain }}
```

**Kubernetes Secret 확인**
```bash
# Secret 존재 확인
kubectl get secret ${{ values.name }}-tls -n ${{ values.namespace }}

# Secret 내용 확인
kubectl describe secret ${{ values.name }}-tls -n ${{ values.namespace }}

# 인증서 디코딩
kubectl get secret ${{ values.name }}-tls -n ${{ values.namespace }} -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

{% if values.sslProvider == "cert-manager" %}
**Cert-Manager 문제**
```bash
# Certificate 상태 확인
kubectl get certificate -n ${{ values.namespace }}
kubectl describe certificate ${{ values.name }}-tls -n ${{ values.namespace }}

# CertificateRequest 확인
kubectl get certificaterequest -n ${{ values.namespace }}

# Cert-Manager 로그 확인
kubectl logs -n cert-manager deployment/cert-manager
```
{% endif %}
{% endif %}

### 4. 성능 문제

#### 증상
- 응답 속도 느림
- 높은 CPU/메모리 사용률

#### 해결방법

**리소스 사용률 확인**
```bash
# 시스템 리소스 확인
top
htop
free -h
df -h

# Docker 컨테이너 리소스 확인
docker stats

# Kubernetes 리소스 확인
kubectl top pods -n ${{ values.namespace }}
kubectl top nodes
```

**NGINX 성능 튜닝**
```nginx
# worker_processes 최적화
worker_processes auto;

# 연결 수 증가
events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

# 버퍼 크기 조정
http {
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
}
```

**캐시 설정 확인**
{% if values.enableCaching %}
```bash
# 캐시 디렉토리 확인
ls -la /var/cache/nginx/

# 캐시 통계 확인
curl http://localhost/nginx_status
```
{% endif %}

### 5. 로그 관련 문제

#### 증상
- 로그가 생성되지 않음
- 로그 파일이 너무 큼

#### 해결방법

**로그 설정 확인**
```bash
# 로그 파일 위치 확인
ls -la /var/log/nginx/

# 로그 파일 권한 확인
ls -la /var/log/nginx/*.log

# 실시간 로그 확인
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**로그 로테이션 설정**
```bash
# logrotate 설정 확인
cat /etc/logrotate.d/nginx

# 수동 로그 로테이션
sudo logrotate -f /etc/logrotate.d/nginx

# 로그 압축 및 정리
find /var/log/nginx/ -name "*.log.*" -mtime +30 -delete
```

### 6. 모니터링 문제

{% if values.enableMonitoring %}
#### 증상
- Prometheus 메트릭이 수집되지 않음
- Grafana 대시보드에 데이터 없음

#### 해결방법

**Exporter 상태 확인**
```bash
# Exporter 엔드포인트 테스트
curl http://localhost:9114/metrics

# Exporter 로그 확인
docker logs <nginx-exporter-container>
kubectl logs deployment/${{ values.name }}-exporter -n ${{ values.namespace }}
```

**Prometheus 설정 확인**
```bash
# Prometheus 타겟 확인
curl http://prometheus:9090/api/v1/targets

# 메트릭 쿼리 테스트
curl 'http://prometheus:9090/api/v1/query?query=nginx_connections_active'
```
{% endif %}

## 디버깅 도구

### 1. 로그 분석 도구

```bash
# 에러 로그 분석
grep "error" /var/log/nginx/error.log | tail -20

# 접근 로그 분석
awk '$9 >= 400' /var/log/nginx/access.log | tail -20

# 응답 시간 분석
awk '{print $NF}' /var/log/nginx/access.log | sort -n | tail -10
```

### 2. 네트워크 디버깅

```bash
# 네트워크 연결 상태
netstat -tulpn | grep nginx
ss -tulpn | grep nginx

# DNS 해석 확인
nslookup ${{ values.domain }}
dig ${{ values.domain }}

# 네트워크 경로 추적
traceroute ${{ values.domain }}
```

### 3. 성능 분석

```bash
# 시스템 성능 모니터링
iostat -x 1
vmstat 1
sar -u 1

# NGINX 프로세스 분석
ps aux | grep nginx
pstree -p nginx

# 파일 디스크립터 확인
lsof -p <nginx-pid>
```

## 문제별 체크리스트

### 서비스 시작 실패
- [ ] 포트 충돌 확인
- [ ] NGINX 설정 문법 검사
- [ ] 파일 권한 확인
- [ ] 로그 파일 확인
- [ ] 리소스 제한 확인

### 연결 문제
- [ ] 서비스 상태 확인
- [ ] 네트워크 연결 테스트
- [ ] 방화벽 설정 확인
- [ ] DNS 해석 확인
- [ ] 프록시 설정 확인

### 성능 문제
- [ ] 리소스 사용률 확인
- [ ] NGINX 설정 최적화
- [ ] 캐시 설정 확인
- [ ] 로드 밸런싱 확인
- [ ] 데이터베이스 연결 확인

### SSL/TLS 문제
- [ ] 인증서 유효성 확인
- [ ] 인증서 만료일 확인
- [ ] SSL 설정 검토
- [ ] 중간 인증서 확인
- [ ] 암호화 스위트 확인

## 응급 복구 절차

### 1. 서비스 롤백

```bash
# Docker Compose 롤백
docker-compose down
git checkout HEAD~1 -- docker-compose.yml
docker-compose up -d

# Kubernetes 롤백
kubectl rollout undo deployment/${{ values.name }} -n ${{ values.namespace }}
kubectl rollout status deployment/${{ values.name }} -n ${{ values.namespace }}
```

### 2. 설정 복구

```bash
# 백업에서 설정 복구
cp /backup/nginx.conf.backup config/nginx.conf
docker-compose restart nginx

# Git에서 설정 복구
git checkout HEAD -- config/
docker-compose restart nginx
```

### 3. 트래픽 우회

```bash
# 유지보수 페이지 활성화
cp maintenance.html html/index.html

# 로드 밸런서에서 서버 제외
# (로드 밸런서별 설정 방법 참조)
```

## 로그 수집 스크립트

```bash
#!/bin/bash
# collect-logs.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/tmp/nginx-logs-$TIMESTAMP"

mkdir -p $LOG_DIR

echo "Collecting NGINX logs and diagnostics..."

# 기본 정보
echo "=== System Information ===" > $LOG_DIR/system-info.txt
uname -a >> $LOG_DIR/system-info.txt
date >> $LOG_DIR/system-info.txt

# NGINX 설정
echo "=== NGINX Configuration ===" > $LOG_DIR/nginx-config.txt
nginx -T >> $LOG_DIR/nginx-config.txt 2>&1

# 로그 파일
cp /var/log/nginx/*.log $LOG_DIR/ 2>/dev/null

# 프로세스 정보
echo "=== Process Information ===" > $LOG_DIR/process-info.txt
ps aux | grep nginx >> $LOG_DIR/process-info.txt

# 네트워크 정보
echo "=== Network Information ===" > $LOG_DIR/network-info.txt
netstat -tulpn | grep nginx >> $LOG_DIR/network-info.txt

# Docker/Kubernetes 정보
if command -v docker &> /dev/null; then
    echo "=== Docker Information ===" > $LOG_DIR/docker-info.txt
    docker ps | grep nginx >> $LOG_DIR/docker-info.txt
    docker logs nginx >> $LOG_DIR/docker-logs.txt 2>&1
fi

if command -v kubectl &> /dev/null; then
    echo "=== Kubernetes Information ===" > $LOG_DIR/k8s-info.txt
    kubectl get pods -n ${{ values.namespace }} >> $LOG_DIR/k8s-info.txt
    kubectl describe deployment/${{ values.name }} -n ${{ values.namespace }} >> $LOG_DIR/k8s-describe.txt
    kubectl logs deployment/${{ values.name }} -n ${{ values.namespace }} >> $LOG_DIR/k8s-logs.txt
fi

# 압축
tar -czf nginx-diagnostics-$TIMESTAMP.tar.gz -C /tmp nginx-logs-$TIMESTAMP/
echo "Diagnostics collected: nginx-diagnostics-$TIMESTAMP.tar.gz"
```

## 지원 연락처

문제가 해결되지 않으면 다음 채널을 통해 지원을 요청하세요:

- **GitHub Issues**: [test-org/nginx-test-service/issues](https://github.com/test-org/nginx-test-service/issues)
- **Platform Team**: platform-team@company.com
- **긴급 상황**: +82-10-XXXX-XXXX (24/7 지원)

### 지원 요청 시 포함할 정보

1. 문제 발생 시간
2. 오류 메시지 (전체 스택 트레이스)
3. 로그 파일 (위 스크립트로 수집)
4. 환경 정보 (OS, Docker/Kubernetes 버전)
5. 최근 변경사항
6. 재현 단계
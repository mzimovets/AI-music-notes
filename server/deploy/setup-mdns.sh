#!/bin/bash
# Настройка mDNS-хостнейма на Raspberry Pi.
# Запускать один раз: sudo bash setup-mdns.sh [hostname]
#
# После выполнения приложение будет доступно как:
#   http://nevsky-songs.local   (или http://<hostname>.local)

HOSTNAME="${1:-nevsky-songs}"

echo "==> Устанавливаем хостнейм: $HOSTNAME"

# 1. Системный хостнейм
hostnamectl set-hostname "$HOSTNAME"
sed -i "s/127\.0\.1\.1.*/127.0.1.1\t$HOSTNAME/" /etc/hosts

# 2. Устанавливаем avahi (mDNS) если не установлен
apt-get update -qq
apt-get install -y avahi-daemon avahi-utils

# 3. Включаем и запускаем
systemctl enable avahi-daemon
systemctl restart avahi-daemon

echo ""
echo "==> Готово! Устройство теперь доступно как: http://$HOSTNAME.local"
echo "    (работает в той же Wi-Fi-сети без знания IP-адреса)"

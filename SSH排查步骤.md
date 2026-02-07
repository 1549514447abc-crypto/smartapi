# SSH 连接问题排查步骤

## 当前情况
- 你的公网 IP: `103.151.172.39`
- 服务器 IP: `119.29.37.208`
- SSH 端口可能是: `32632`

---

## 第一步：查 SSH 端口

在服务器运行：

```bash
netstat -tlnp | grep sshd
```

把结果发我。

---

## 第二步：开两个服务器窗口

### 窗口1 - 看实时日志：
```bash
tail -f /var/log/secure
```

### 窗口2 - 抓包看连接：
```bash
tcpdump -i eth0 host 103.151.172.39
```

---

## 第三步：本地电脑连接

在你 Windows 电脑 CMD 运行：

```bash
ssh -p 22 root@119.29.37.208
```

---

## 第四步：看结果

1. 如果日志里出现 `103.151.172.39` → 连接到了 SSH，问题在认证
2. 如果 tcpdump 有数据但日志没有 → 连接被防火墙拦截
3. 如果 tcpdump 也没数据 → 连接根本没到服务器

---

## 快速解决方案

如果上面太麻烦，直接在服务器运行这个临时放行你的 IP：

```bash
iptables -I INPUT -s 103.151.172.39 -p tcp --dport 32632 -j ACCEPT
iptables -I INPUT -s 103.151.172.39 -p tcp --dport 22 -j ACCEPT
```

然后本地再试连接。

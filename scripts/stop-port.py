# Stops a Next.js server by port without matching (and killing) the calling shell, unlike pkill -f.
import os, sys, signal
port = sys.argv[1]
me = {os.getpid(), os.getppid()}
for pid in filter(str.isdigit, os.listdir('/proc')):
    try:
        cmd = open(f'/proc/{pid}/cmdline','rb').read().replace(b'\0', b' ').decode()
    except Exception:
        continue
    if int(pid) not in me and 'next' in cmd and f'-p {port}' in cmd and 'stop-port' not in cmd:
        os.kill(int(pid), signal.SIGTERM); print('stopped', pid)

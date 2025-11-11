import multiprocessing

# Worker settings
workers = 1  # Use only 1 worker on free tier to save memory
worker_class = 'sync'
worker_connections = 1000
timeout = 300  # 5 minutes for large file processing
keepalive = 2

# Memory and performance
max_requests = 100  # Restart workers after N requests to prevent memory leaks
max_requests_jitter = 20
preload_app = False  # Don't preload to save memory

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

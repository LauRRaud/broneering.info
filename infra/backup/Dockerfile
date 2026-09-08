FROM postgres:18@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280
RUN apt-get update && apt-get install -y --no-install-recommends pgbackrest=2.59.1-1.pgdg13+1 && rm -rf /var/lib/apt/lists/*
COPY restore-empty.sh /usr/local/bin/restore-empty
RUN chmod 755 /usr/local/bin/restore-empty

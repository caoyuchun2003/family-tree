FROM python:3.12-slim

WORKDIR /app
COPY server.py requirements.txt ./
RUN mkdir -p /data/genealogy

ENV DATA_DIR=/data/genealogy
ENV PORT=18091
EXPOSE 18091

CMD ["python", "server.py"]

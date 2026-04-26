package com.alibaba.himarket.service.agent;

public interface AgentEventIngestService {

    IngestResult ingest(byte[] body, String idempotencyKey);

    record IngestResult(String taskId, boolean duplicate) {

        public static IngestResult accepted(String taskId) {
            return new IngestResult(taskId, false);
        }

        public static IngestResult duplicate(String taskId) {
            return new IngestResult(taskId, true);
        }
    }
}

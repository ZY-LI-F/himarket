package com.alibaba.himarket.service.agent;

public interface AgentNacosConfigClient {

    void publish(String dataId, String content);

    String get(String dataId);
}

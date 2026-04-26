package com.alibaba.himarket.service.agent;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class HiClawBridgeConfig {

    @Bean
    public HiClawBridgeClient hiClawBridgeClient(
            ObjectProvider<WebClient.Builder> webClientBuilderProvider,
            @Value("${hiclaw.bridge.mode:mock}") String mode,
            @Value("${hiclaw.bridge.url:http://localhost:8088}") String bridgeUrl,
            @Value("${hiclaw.bridge.token:dev-token}") String bridgeToken) {
        if ("mock".equalsIgnoreCase(mode)) {
            return new MockHiClawBridgeClient();
        }
        if (!"real".equalsIgnoreCase(mode)) {
            throw new IllegalArgumentException("Unsupported hiclaw.bridge.mode: " + mode);
        }
        if (!StringUtils.hasText(bridgeUrl)) {
            throw new IllegalArgumentException("hiclaw.bridge.url must not be blank in real mode");
        }
        if (!StringUtils.hasText(bridgeToken)) {
            throw new IllegalArgumentException(
                    "hiclaw.bridge.token must not be blank in real mode");
        }
        WebClient.Builder webClientBuilder =
                webClientBuilderProvider.getIfAvailable(WebClient::builder);
        WebClient webClient =
                webClientBuilder
                        .baseUrl(bridgeUrl)
                        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + bridgeToken)
                        .build();
        return new WebClientHiClawBridgeClient(webClient);
    }
}

package com.alibaba.himarket.core.security;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;

public final class AgentEgressHeaders {

    public static final String HIGRESS_GATEWAY_HOST_PREFIX = "higress-gateway";

    private AgentEgressHeaders() {}

    public static Map<String, String> withHigressHost(Map<String, String> headers, String uri) {
        if (!StringUtils.hasText(uri)) {
            throw new IllegalArgumentException("Agent egress URI must not be blank");
        }
        return withHigressHost(headers, URI.create(uri));
    }

    public static Map<String, String> withHigressHost(Map<String, String> headers, URI uri) {
        String host = hostHeaderValue(uri);
        if (!host.startsWith(HIGRESS_GATEWAY_HOST_PREFIX)) {
            throw new IllegalArgumentException(
                    "Agent egress must target Higress gateway host, actual host: " + host);
        }
        Map<String, String> result = new LinkedHashMap<>();
        if (headers != null) {
            result.putAll(headers);
        }
        result.put(HttpHeaders.HOST, host);
        return result;
    }

    private static String hostHeaderValue(URI uri) {
        if (uri == null || !StringUtils.hasText(uri.getHost())) {
            throw new IllegalArgumentException("Agent egress URI must include a host");
        }
        if (uri.getPort() < 0) {
            return uri.getHost();
        }
        return uri.getHost() + ":" + uri.getPort();
    }
}

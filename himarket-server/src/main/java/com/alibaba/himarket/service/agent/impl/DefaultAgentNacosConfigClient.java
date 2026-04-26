package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.result.nacos.NacosResult;
import com.alibaba.himarket.entity.NacosInstance;
import com.alibaba.himarket.service.NacosService;
import com.alibaba.himarket.service.agent.AgentNacosConfigClient;
import com.alibaba.nacos.api.PropertyKeyConst;
import com.alibaba.nacos.api.config.ConfigFactory;
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.maintainer.client.naming.NamingMaintainerFactory;
import com.alibaba.nacos.maintainer.client.naming.NamingMaintainerService;
import java.util.Objects;
import java.util.Properties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Slf4j
@ConditionalOnBean(NacosService.class)
public class DefaultAgentNacosConfigClient implements AgentNacosConfigClient {

    private static final String DEFAULT_CONTEXT_PATH = "nacos";
    private static final String CONFIG_TYPE_JSON = "json";

    private final NacosService nacosService;
    private final String namespaceId;
    private final String group;
    private final boolean autoCreateNamespace;

    private volatile String cachedKey;
    private volatile ConfigService cachedConfigService;

    public DefaultAgentNacosConfigClient(
            NacosService nacosService,
            @Value("${nacos.agent-workspace.namespace:agent-workspace}") String namespaceId,
            @Value("${nacos.agent-workspace.group:AGENT_WORKSPACE}") String group,
            @Value("${nacos.agent-workspace.auto-create-namespace:true}")
                    boolean autoCreateNamespace) {
        this.nacosService = nacosService;
        this.namespaceId = normalizeNamespace(namespaceId);
        this.group = group;
        this.autoCreateNamespace = autoCreateNamespace;
    }

    @Override
    public void publish(String dataId, String content) {
        try {
            boolean ok = configService().publishConfig(dataId, group, content, CONFIG_TYPE_JSON);
            if (!ok) {
                throw new IllegalStateException("Nacos returned false for dataId " + dataId);
            }
        } catch (NacosException e) {
            throw new IllegalStateException("Failed to publish Nacos dataId " + dataId, e);
        }
    }

    @Override
    public String get(String dataId) {
        try {
            return configService().getConfig(dataId, group, 3000L);
        } catch (NacosException e) {
            throw new IllegalStateException("Failed to read Nacos dataId " + dataId, e);
        }
    }

    private ConfigService configService() throws NacosException {
        NacosInstance instance = defaultNacosInstance();
        String key = cacheKey(instance);
        ConfigService service = cachedConfigService;
        if (service != null && key.equals(cachedKey)) {
            return service;
        }
        synchronized (this) {
            if (cachedConfigService != null && key.equals(cachedKey)) {
                return cachedConfigService;
            }
            ensureNamespace(instance);
            ConfigService newService =
                    ConfigFactory.createConfigService(properties(instance, namespaceId));
            ConfigService oldService = cachedConfigService;
            cachedConfigService = newService;
            cachedKey = key;
            shutdownQuietly(oldService);
            return newService;
        }
    }

    private void ensureNamespace(NacosInstance instance) throws NacosException {
        if (!autoCreateNamespace || !StringUtils.hasText(namespaceId)) {
            return;
        }
        NamingMaintainerService namingService =
                NamingMaintainerFactory.createNamingMaintainerService(properties(instance, ""));
        Boolean exists = namingService.checkNamespaceIdExist(namespaceId);
        if (!Boolean.TRUE.equals(exists)) {
            Boolean created =
                    namingService.createNamespace(
                            namespaceId, namespaceId, "HiMarket agent workspace snapshots");
            if (!Boolean.TRUE.equals(created)) {
                throw new IllegalStateException(
                        "Nacos returned false when creating namespace " + namespaceId);
            }
            log.info("Created Nacos namespace for agent workspace sync: {}", namespaceId);
        }
    }

    private NacosInstance defaultNacosInstance() {
        NacosResult defaultInstance = nacosService.getDefaultNacosInstance();
        if (defaultInstance == null || !StringUtils.hasText(defaultInstance.getNacosId())) {
            throw new IllegalStateException("Default Nacos instance is not configured");
        }
        NacosInstance instance = nacosService.findNacosInstanceById(defaultInstance.getNacosId());
        if (!StringUtils.hasText(instance.getServerUrl())) {
            throw new IllegalStateException("Default Nacos serverUrl is not configured");
        }
        return instance;
    }

    private Properties properties(NacosInstance instance, String namespace) {
        Properties properties = new Properties();
        properties.setProperty(PropertyKeyConst.SERVER_ADDR, instance.getServerUrl());
        properties.setProperty(PropertyKeyConst.CONTEXT_PATH, DEFAULT_CONTEXT_PATH);
        properties.setProperty(PropertyKeyConst.NAMESPACE, namespace);
        setIfPresent(properties, PropertyKeyConst.USERNAME, instance.getUsername());
        setIfPresent(properties, PropertyKeyConst.PASSWORD, instance.getPassword());
        setIfPresent(properties, PropertyKeyConst.ACCESS_KEY, instance.getAccessKey());
        setIfPresent(properties, PropertyKeyConst.SECRET_KEY, instance.getSecretKey());
        return properties;
    }

    private void setIfPresent(Properties properties, String key, String value) {
        if (Objects.nonNull(value)) {
            properties.setProperty(key, value);
        }
    }

    private String cacheKey(NacosInstance instance) {
        return String.join(
                "|",
                nullToEmpty(instance.getNacosId()),
                nullToEmpty(instance.getServerUrl()),
                nullToEmpty(instance.getUsername()),
                nullToEmpty(instance.getPassword()),
                nullToEmpty(instance.getAccessKey()),
                nullToEmpty(instance.getSecretKey()),
                namespaceId);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private void shutdownQuietly(ConfigService service) {
        if (service == null) {
            return;
        }
        try {
            service.shutDown();
        } catch (NacosException | RuntimeException e) {
            log.warn("Failed to shut down stale Nacos ConfigService", e);
        }
    }

    private String normalizeNamespace(String namespace) {
        if (!StringUtils.hasText(namespace) || "public".equals(namespace)) {
            return "";
        }
        return namespace;
    }
}

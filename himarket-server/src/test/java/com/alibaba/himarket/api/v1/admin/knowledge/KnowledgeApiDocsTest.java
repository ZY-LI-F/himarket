/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package com.alibaba.himarket.api.v1.admin.knowledge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class KnowledgeApiDocsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern ENDPOINT_ROW =
            Pattern.compile(
                    "^\\|\\s*(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\\s*\\|\\s*`?([^`|]+?)`?\\s*\\|.*$");
    private static final Set<String> HTTP_METHODS =
            Set.of("get", "post", "put", "delete", "patch", "options", "head");

    @Test
    void markdownEndpointListMatchesOpenapiPaths() throws IOException {
        Path docsDir = docsDir();

        Set<Endpoint> openapiEndpoints = openapiEndpoints(docsDir.resolve("openapi.json"));
        Set<Endpoint> markdownEndpoints = markdownEndpoints(docsDir.resolve("knowledge-api.md"));

        assertFalse(openapiEndpoints.isEmpty(), "openapi.json must declare endpoints");
        assertEquals(openapiEndpoints, markdownEndpoints);
    }

    private static Set<Endpoint> openapiEndpoints(Path openapiPath) throws IOException {
        JsonNode paths = MAPPER.readTree(openapiPath.toFile()).path("paths");
        if (!paths.isObject()) {
            throw new AssertionError("openapi.json must contain an object at $.paths");
        }

        TreeSet<Endpoint> endpoints = new TreeSet<>();
        Iterator<Map.Entry<String, JsonNode>> pathEntries = paths.fields();
        while (pathEntries.hasNext()) {
            Map.Entry<String, JsonNode> pathEntry = pathEntries.next();
            Iterator<String> methods = pathEntry.getValue().fieldNames();
            while (methods.hasNext()) {
                String method = methods.next();
                if (HTTP_METHODS.contains(method)) {
                    endpoints.add(
                            new Endpoint(method.toUpperCase(Locale.ROOT), pathEntry.getKey()));
                }
            }
        }
        return endpoints;
    }

    private static Set<Endpoint> markdownEndpoints(Path markdownPath) throws IOException {
        TreeSet<Endpoint> endpoints = new TreeSet<>();
        for (String line : Files.readAllLines(markdownPath, StandardCharsets.UTF_8)) {
            Matcher matcher = ENDPOINT_ROW.matcher(line);
            if (matcher.matches()) {
                endpoints.add(
                        new Endpoint(
                                matcher.group(1).toUpperCase(Locale.ROOT),
                                matcher.group(2).trim()));
            }
        }
        return endpoints;
    }

    private static Path docsDir() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            Path moduleDocs = current.resolve("himarket-server").resolve("docs").resolve("api");
            if (Files.isDirectory(moduleDocs)) {
                return moduleDocs;
            }

            Path localDocs = current.resolve("docs").resolve("api");
            if (Files.isDirectory(localDocs)) {
                return localDocs;
            }

            current = current.getParent();
        }
        throw new AssertionError("Cannot locate himarket-server/docs/api from test working dir");
    }

    private record Endpoint(String method, String path) implements Comparable<Endpoint> {

        @Override
        public int compareTo(Endpoint other) {
            int pathComparison = path.compareTo(other.path);
            if (pathComparison != 0) {
                return pathComparison;
            }
            return method.compareTo(other.method);
        }
    }
}

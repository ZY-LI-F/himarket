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

package com.alibaba.himarket;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FlywayMigrationIT {

    private static final String BASELINE_MIGRATION = "V1__Create_baseline_schema.sql";
    private static final String WORKER_TEAM_PRODUCT_MIGRATION =
            "V18__Add_worker_team_product_tables.sql";
    private static final Pattern CREATE_TABLE_PATTERN =
            Pattern.compile("CREATE TABLE IF NOT EXISTS `([^`]+)`", Pattern.CASE_INSENSITIVE);
    private static final Pattern NAMED_KEY_PATTERN =
            Pattern.compile("(\\b(?:UNIQUE\\s+)?KEY\\s+)`([^`]+)`", Pattern.CASE_INSENSITIVE);

    @TempDir private Path migrationDir;

    @Test
    void migratesWorkerTeamProductTables() throws Exception {
        copyBaselineMigrationForH2();
        copyMigration(WORKER_TEAM_PRODUCT_MIGRATION);

        String jdbcUrl =
                "jdbc:h2:mem:flyway_worker_team_product;"
                        + "MODE=MySQL;"
                        + "DATABASE_TO_LOWER=TRUE;"
                        + "CASE_INSENSITIVE_IDENTIFIERS=TRUE;"
                        + "DB_CLOSE_DELAY=-1";

        Flyway.configure()
                .dataSource(jdbcUrl, "sa", "")
                .locations("filesystem:" + migrationDir.toAbsolutePath().toString())
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(jdbcUrl, "sa", "")) {
            assertTrue(tableExists(connection, "worker_team_product"));
            assertTrue(tableExists(connection, "worker_team_product_member"));
            assertWorkerTeamProductMemberForeignKey(connection);
            assertWorkerTeamProductMemberRoleConstraint(connection);
        }
    }

    private void copyMigration(String migrationName) throws IOException {
        try (InputStream input = openMigration(migrationName)) {
            Files.copy(input, migrationDir.resolve(migrationName));
        }
    }

    private void copyBaselineMigrationForH2() throws IOException {
        String baseline;
        try (InputStream input = openMigration(BASELINE_MIGRATION)) {
            baseline = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }

        String h2CompatibleBaseline = makeBaselineH2Compatible(baseline);
        Files.writeString(
                migrationDir.resolve(BASELINE_MIGRATION),
                h2CompatibleBaseline,
                StandardCharsets.UTF_8);
    }

    private String makeBaselineH2Compatible(String baseline) {
        String withoutTransactionControl =
                baseline.replaceAll("(?im)^\\s*(START TRANSACTION|COMMIT);\\s*$\\R?", "");
        StringBuilder rewritten = new StringBuilder();
        String currentTableName = null;

        for (String line : withoutTransactionControl.split("\\R", -1)) {
            Matcher tableMatcher = CREATE_TABLE_PATTERN.matcher(line);
            if (tableMatcher.find()) {
                currentTableName = tableMatcher.group(1);
            }
            if (currentTableName != null) {
                line = prefixNamedKeysWithTableName(line, currentTableName);
            }
            rewritten.append(line).append(System.lineSeparator());
        }

        return rewritten.toString();
    }

    private String prefixNamedKeysWithTableName(String line, String tableName) {
        Matcher matcher = NAMED_KEY_PATTERN.matcher(line);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(
                    result,
                    Matcher.quoteReplacement(
                            matcher.group(1) + "`" + tableName + "_" + matcher.group(2) + "`"));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private InputStream openMigration(String migrationName) {
        InputStream input =
                FlywayMigrationIT.class.getResourceAsStream("/db/migration/" + migrationName);
        assertNotNull(input, "Missing migration resource: " + migrationName);
        return input;
    }

    private boolean tableExists(Connection connection, String tableName) throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        try (ResultSet tables = metaData.getTables(null, null, tableName, new String[] {"TABLE"})) {
            return tables.next();
        }
    }

    private void assertWorkerTeamProductMemberForeignKey(Connection connection)
            throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        try (ResultSet keys = metaData.getImportedKeys(null, null, "worker_team_product_member")) {
            boolean hasWorkerTeamProductForeignKey = false;
            while (keys.next()) {
                if ("worker_team_product".equalsIgnoreCase(keys.getString("PKTABLE_NAME"))
                        && "product_id".equalsIgnoreCase(keys.getString("PKCOLUMN_NAME"))
                        && "product_id".equalsIgnoreCase(keys.getString("FKCOLUMN_NAME"))) {
                    hasWorkerTeamProductForeignKey = true;
                }
            }
            assertTrue(hasWorkerTeamProductForeignKey);
        }
    }

    private void assertWorkerTeamProductMemberRoleConstraint(Connection connection)
            throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(
                    """
                    INSERT INTO worker_team_product (
                        product_id,
                        name,
                        version,
                        status,
                        visibility
                    ) VALUES (
                        'team-product-1',
                        'Team Product',
                        '1.0.0',
                        'draft',
                        'private'
                    )
                    """);

            statement.executeUpdate(
                    """
                    INSERT INTO worker_team_product_member (
                        product_id,
                        role,
                        ref_name,
                        ref_version,
                        `ordinal`
                    ) VALUES (
                        'team-product-1',
                        'leader',
                        'worker-leader',
                        '1.0.0',
                        0
                    )
                    """);

            assertThrows(
                    SQLException.class,
                    () ->
                            statement.executeUpdate(
                                    """
                                    INSERT INTO worker_team_product_member (
                                        product_id,
                                        role,
                                        ref_name,
                                        ref_version,
                                        `ordinal`
                                    ) VALUES (
                                        'team-product-1',
                                        'owner',
                                        'worker-owner',
                                        '1.0.0',
                                        1
                                    )
                                    """));
        }
    }
}

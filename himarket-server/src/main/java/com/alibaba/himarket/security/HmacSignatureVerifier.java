package com.alibaba.himarket.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class HmacSignatureVerifier {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final String SIGNATURE_PREFIX = "sha256=";

    public boolean verify(byte[] body, String signature, String secret) {
        if (!StringUtils.hasText(signature)) {
            return false;
        }
        String normalizedSignature = signature.trim();
        if (!normalizedSignature.startsWith(SIGNATURE_PREFIX)) {
            return false;
        }
        String expected = sign(body, secret);
        return MessageDigest.isEqual(
                normalizedSignature.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }

    public String sign(byte[] body, String secret) {
        if (!StringUtils.hasText(secret)) {
            throw new IllegalArgumentException("HMAC secret must not be blank");
        }
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            return SIGNATURE_PREFIX + HexFormat.of().formatHex(mac.doFinal(body));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC signature", e);
        }
    }
}

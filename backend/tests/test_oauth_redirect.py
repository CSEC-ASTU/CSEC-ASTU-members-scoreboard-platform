from app.api.v1.routers.auth import generate_signed_state, verify_signed_state

def test_signed_state_with_redirect():
    secret = "super-secret-key-for-test"
    target = "/members/m-target-123"

    state = generate_signed_state(secret, redirect=target)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect == target

def test_signed_state_without_redirect():
    secret = "super-secret-key-for-test"

    state = generate_signed_state(secret)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect is None

def test_signed_state_tampering_fails():
    secret = "super-secret-key-for-test"
    target = "/members/m-target-123"

    state = generate_signed_state(secret, redirect=target)
    parts = state.split(":")
    # Tamper with the redirect payload
    tampered_redirect = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
    tampered = f"{parts[0]}:{parts[1]}:{tampered_redirect}:{parts[3]}"
    valid, redirect = verify_signed_state(tampered, secret)

    assert valid is False
    assert redirect is None

def test_open_redirect_prevention():
    secret = "super-secret-key-for-test"
    malicious = "//evil.com/phish"

    # Should not treat double slash as valid internal path
    state = generate_signed_state(secret, redirect=malicious)
    valid, redirect = verify_signed_state(state, secret)

    assert valid is True
    assert redirect is None

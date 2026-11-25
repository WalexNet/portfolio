from app.tools.compose_validator.validator import analyze_compose


def codes(source):
    return {f['code'] for f in analyze_compose(source)['findings']}


def test_valid_service():
    assert analyze_compose('services:\n  web:\n    image: nginx:1.27\n')['errors'] == 0


def test_duplicate_key():
    assert 'YAML' in codes('services:\n  web:\n    image: nginx\n    image: redis\n')


def test_missing_dependency():
    assert 'DEPENDS_MISSING' in codes('services:\n  web:\n    image: nginx\n    depends_on: [db]\n')


def test_dependency_cycle():
    assert 'DEPENDS_CYCLE' in codes('services:\n  a:\n    image: x\n    depends_on: [b]\n  b:\n    image: y\n    depends_on: [a]\n')


def test_port_collision():
    source = 'services:\n  a:\n    image: a\n    ports: ["8080:80"]\n  b:\n    image: b\n    ports: ["8080:80"]\n'
    assert 'PORT_COLLISION' in codes(source)


def test_named_volume():
    assert 'VOLUME_MISSING' in codes('services:\n  app:\n    image: app\n    volumes: ["missing:/data"]\n')


def test_unsafe_yaml_tag():
    assert 'YAML' in codes('services: !!python/object/apply:os.system ["id"]')

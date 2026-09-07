import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('provision', Path(__file__).parents[1] / 'infra' / 'provision-domain.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ProvisioningBoundaries(unittest.TestCase):
    def test_platform_domains_only(self):
        self.assertEqual(module.domain_for('salong-test'), 'salong-test.broneering.info')
        for slug in ['haldus', 'cdn', 'demo', '../other', 'example.com', 'bad;touch', 'UPPER', 'ab', 'x' * 51]:
            with self.assertRaises(ValueError): module.domain_for(slug)

    def test_configuration_preserves_proxy_boundaries(self):
        config = module.nginx_config('salong.broneering.info', 'broneering-tenant-salong')
        self.assertIn('proxy_pass http://127.0.0.1:3107;', config)
        self.assertIn('proxy_set_header X-Forwarded-For $remote_addr;', config)
        self.assertIn('limit_req zone=broneering_api', config)
        self.assertIn('/etc/letsencrypt/live/broneering-tenant-salong/fullchain.pem', config)

    def test_sql_literal_quotes_names_without_sql_execution(self):
        self.assertEqual(module.literal("O'Connor"), "'O''Connor'")

if __name__ == '__main__': unittest.main()

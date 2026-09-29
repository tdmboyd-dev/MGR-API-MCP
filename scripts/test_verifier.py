"""Check that publication and recovery checks catch meaningful failures."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from verify_repository import verify

class IntegrityChecks(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        for name in ['README.md','AGENTS.md','BEAST-UNIVERSAL.md','HANDOFF.md','BUILD-QUEUE.md','AUDIT-LEDGER.md','research/README.md','docs/full-build/SCORECARD.md']:
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('Fixture\n')
    def tearDown(self): self.tmp.cleanup()
    def test_valid_minimal_home(self): self.assertEqual(verify(self.root)['status'],'PASS')
    def test_broken_link_detected(self):
        (self.root/'README.md').write_text('[missing](missing.md)')
        self.assertTrue(any('Broken local link' in e for e in verify(self.root)['errors']))
    def test_raw_pdf_rejected(self):
        (self.root/'source.pdf').write_bytes(b'%PDF-fixture')
        self.assertTrue(any('Unexpected public' in e for e in verify(self.root)['errors']))
    def test_synthetic_secret_detected_without_echo(self):
        marker='ghp_'+'A'*36
        (self.root/'accidental.txt').write_text(marker)
        report=verify(self.root)
        self.assertTrue(any('Potential secret' in e for e in report['errors']))
        self.assertNotIn(marker,json.dumps(report))
    def test_missing_or_corrupt_local_source_detected(self):
        folder=self.root/'research/manifests';folder.mkdir(parents=True,exist_ok=True)
        p=self.root/'.local/checkpoint/original.txt';p.parent.mkdir(parents=True);p.write_bytes(b'original')
        (folder/'checkpoint-inventory.json').write_text(json.dumps([{'checkpoint_path':'original.txt','local_path':'.local/checkpoint/original.txt','bytes':8,'sha256':hashlib.sha256(b'original').hexdigest()}]))
        (folder/'community-additions-2026-09-28.json').write_text('{"files":[]}')
        (folder/'standards-2026-09-28.json').write_text('[]')
        self.assertEqual(verify(self.root,local=True)['status'],'PASS')
        p.write_bytes(b'corrupt!')
        self.assertTrue(any('Checkpoint missing or changed' in e for e in verify(self.root,local=True)['errors']))

if __name__=='__main__': unittest.main()

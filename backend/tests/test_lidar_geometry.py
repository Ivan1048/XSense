"""Geometry regressions; run: python3 -m unittest discover -s backend/tests."""
import unittest
from backend.services.lidar_evaluator import _check_ray_obstacle, evaluate_lidar_scenario


class LidarGeometryTests(unittest.TestCase):
    def test_volume_intersection(self):
        for obstacle in (
            dict(type='box', pos=(0, -5), size=(2, 4), h=2, name='box'),
            dict(type='cylinder', pos=(0, -5), r=2, h=1.5, name='cylinder'),
        ):
            self.assertTrue(_check_ray_obstacle((0, 0), (0, -10), obstacle)[0])

    def test_misses_never_trigger_or_boost(self):
        for kwargs in (
            dict(person_position=[-16, 10]),
            dict(person_position=[30, 30]),
            dict(person_position=[-10.5, 11.5], sensor_offline=True),
            dict(person_position=[-15, 3.8]),  # Palm trunk omitted by the old backend inventory.
            dict(person_position=[-10.5, 11.5], device_id='UNKNOWN'),
            dict(person_position=[float('nan'), 0]),
            dict(person_position=[1]),
        ):
            with self.subTest(kwargs=kwargs):
                result = evaluate_lidar_scenario('silent_fall', **kwargs)
                self.assertFalse(result['detected'])
                self.assertFalse(result['trigger_incident'])
                self.assertIsNone(result['lighting_boost_pct'])

    def test_valid_fall(self):
        self.assertTrue(evaluate_lidar_scenario('silent_fall', person_position=[-10.5, 11.5])['trigger_incident'])


if __name__ == '__main__':
    unittest.main()

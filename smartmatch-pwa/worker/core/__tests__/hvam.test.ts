
import { updatePosterior, projectArchetypes, initNewSession } from '../hvam';
import { Mindprint } from '../types';

describe('HVAM Core Logic', () => {

    describe('updatePosterior', () => {
        it('should reduce uncertainty (sigma) when new information is provided', () => {
            const initial: Mindprint = {
                mu: [0.5, 0.5],
                sigma: [0.33, 0.33]
            };

            const impacts = [{ traitIdx: 0, mu: 0.9, var: 0.05 }];
            const result = updatePosterior(initial, impacts);

            // Sigma for trait 0 should decrease
            expect(result.sigma[0]).toBeLessThan(0.33);
            // Mu for trait 0 should move towards 0.9
            expect(result.mu[0]).toBeGreaterThan(0.5);

            // Trait 1 should remain unchanged
            expect(result.mu[1]).toBe(0.5);
            expect(result.sigma[1]).toBe(0.33);
        });

        it('should clamp values within bounds', () => {
            const initial: Mindprint = { mu: [0.9], sigma: [0.1] };
            // Very strong consistent update pushing upwards
            const impacts = [{ traitIdx: 0, mu: 1.5, var: 0.001 }];
            const result = updatePosterior(initial, impacts);

            expect(result.mu[0]).toBeLessThanOrEqual(1.0); // Clamped at 1
        });
    });

    describe('projectArchetypes', () => {
        it('should calculate archetype scores correctly', () => {
            const mindprint: Mindprint = {
                mu: [1, 0, 0, 0, 0, 0, 0], // High Trait 0 (Camera)
                sigma: new Array(7).fill(0.1)
            };

            const archetypes = [
                {
                    id: 'photo', name: 'Photographer',
                    signature: { Camera: 1, BatteryEndurance: 0, Performance: 0, Display: 0, SoftwareExperience: 0, DesignBuild: 0, LongevityValue: 0 }
                },
                {
                    id: 'gamer', name: 'Gamer',
                    signature: { Camera: 0, BatteryEndurance: 0, Performance: 1, Display: 0, SoftwareExperience: 0, DesignBuild: 0, LongevityValue: 0 }
                }
            ];

            const probs = projectArchetypes(mindprint, archetypes);

            // Photographer should have higher probability
            expect(probs[0]).toBeGreaterThan(probs[1]);
            // Sum should be 1 (Softmax)
            expect(probs.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 4);
        });
    });

});

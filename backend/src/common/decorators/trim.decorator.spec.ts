import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, validate } from 'class-validator';

import { Trim } from './trim.decorator';

// ─────────────────────── Fixtures ────────────────────────
class SampleInput {
  @Trim()
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @Trim({ emptyToNull: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;
}

const toInput = (plain: Record<string, unknown>) =>
  plainToInstance(SampleInput, plain);

// ─────────────────────── Suite ───────────────────────────
describe('Trim', () => {
  it('deve remover espaços nas pontas', () => {
    // Arrange / Act
    const input = toInput({
      name: '  Torno CNC  ',
      description: '  revisão  ',
    });

    // Assert
    expect(input.name).toBe('Torno CNC');
    expect(input.description).toBe('revisão');
  });

  it('deve reprovar campo obrigatório preenchido só com espaços', async () => {
    // Arrange
    const input = toInput({ name: '   ' });

    // Act
    const errors = await validate(input);

    // Assert
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('deve converter opcional em branco para null com emptyToNull', async () => {
    // Arrange
    const input = toInput({ name: 'Prensa', description: '   ' });

    // Act
    const errors = await validate(input);

    // Assert
    expect(input.description).toBeNull();
    expect(errors).toHaveLength(0);
  });

  it('não deve alterar valores que não são texto', () => {
    // Arrange / Act
    const input = toInput({ name: 'Prensa', description: undefined });

    // Assert
    expect(input.description).toBeUndefined();
  });
});

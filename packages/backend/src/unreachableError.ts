/**
 * An error reporting that the given value represents an unreachable case.
 *
 * It is intended to mark a branch in control flow that should be unreachable, such as the default
 * case in an exhaustive switch. For example:
 * ```ts
 *   const x: 'A' | 'B' | 'C' = ...;
 *   switch (x) {
 *     case 'A':
 *       ...
 *       break;
 *     case 'B':
 *       ...
 *       break;
 *     case 'C':
 *       ...
 *       break;
 *     default:
 *       throw new UnreachableError(x);
 *   }
 * ```
 *
 * The `never` type of the parameter `x` is evidence that the surrounding control flow has exhausted
 * the possible values of a discriminating expression, proving that the branch is unreachable.
 * However, since the statically inferred types are not enforced at runtime, this error should still
 * be thrown, in order to guarantee a diversion of control flow at runtime.
 */
export class UnreachableError extends Error {
  /** @param x an unreachable value */
  constructor(x: never) {
    super(`unhandled case: ${JSON.stringify(x)}`);
  }
}

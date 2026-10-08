import { Param, ParseUUIDPipe } from '@nestjs/common';

/** The `:id` path parameter, rejected with 400 unless it is a UUID. */
export const IdParam = () => Param('id', ParseUUIDPipe);

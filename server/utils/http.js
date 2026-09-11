import { createPagination } from './pagination.js';

const assertMessage = (message) => {
  if (typeof message !== 'string') throw new TypeError('Response message must be a string');
  return message;
};

/**
 * Build the canonical success envelope. Pagination compatibility fields are
 * mirrored here—and only here—when metadata is supplied.
 */
export const success = (data, message = 'Request successful', pagination) => {
  const envelope = {
    success: true,
    data,
    message: assertMessage(message),
  };

  if (pagination !== undefined) {
    const metadata = createPagination(pagination);
    envelope.pagination = metadata;
    envelope.page = metadata.page;
    envelope.pages = metadata.pages;
    envelope.total = metadata.total;
  }

  return envelope;
};

export const failure = (message = 'Request failed', data = null) => ({
  success: false,
  data,
  message: assertMessage(message),
});

export const listSuccess = (data, pagination, message = 'Records retrieved') =>
  success(data, message, pagination);

/** Build the temporary login shape consumed by the active React client. */
export const loginSuccess = (token, user, message = 'Login successful') => ({
  ...success({ token, user }, message),
  token,
  user,
});

/** Build the temporary playback shape consumed by the active audio client. */
export const playbackSuccess = (
  { url, expiresIn, fileName },
  message = 'Playback URL generated',
) => ({
  ...success({ url, expiresIn, fileName }, message),
  url,
  expiresIn,
  fileName,
});

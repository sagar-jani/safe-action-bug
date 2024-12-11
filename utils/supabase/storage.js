export const EMPTY_FOLDER_PLACEHOLDER_FILE_NAME = '.emptyFolderPlaceholder';

export async function remove(client, { bucket, path }) {
  console.log('[decodeURIComponent(path.join("/"))]', [
    decodeURIComponent(path.join('/'))
  ]);
  return client.storage
    .from(bucket)
    .remove([decodeURIComponent(path.join('/'))]);
}

export async function upload(client, { file, path, bucket }) {
  const storage = client.storage.from(bucket);

  const result = await storage.upload(path.join('/'), file, {
    upsert: true,
    cacheControl: '3600'
  });

  if (!result.error) {
    return storage.getPublicUrl(path.join('/')).data.publicUrl;
  }

  throw result.error;
}

export async function createFolder(client, { bucket, path, name }) {
  const fullPath = decodeURIComponent(
    [...path, name, EMPTY_FOLDER_PLACEHOLDER_FILE_NAME].join('/')
  );

  const { error, data } = await client.storage
    .from(bucket)
    .upload(fullPath, new File([], EMPTY_FOLDER_PLACEHOLDER_FILE_NAME));

  if (error) {
    throw Error(error.message);
  }

  return data;
}

// export async function deleteFolder(client, { bucket, path }) {
//   const { data: list } = await client.storage
//     .from(bucket)
//     .list(decodeURIComponent(path.join('/')));
//   console.log('deleteFolder list', list);

//   const filesToRemove = list?.flatMap((file) => {
//     // Folder, remove empty file before folder
//     if (!file.id) {
//       return [
//         `${decodeURIComponent(
//           [...path, file.name].join('/')
//         )}/${EMPTY_FOLDER_PLACEHOLDER_FILE_NAME}`,
//         decodeURIComponent([...path, file.name].join('/'))
//       ];
//     }

//     return [decodeURIComponent([...path, file.name].join('/'))];
//   });

//   console.log('filesToRemove', filesToRemove);

//   return client.storage.from(bucket).remove(filesToRemove);
// }

export async function deleteFolder(client, { bucket, path }) {
  console.log('deleteFolder', { bucket, path });
  async function recursiveDelete(currentPath) {
    const { data: list, error } = await client.storage
      .from(bucket)
      .list(decodeURIComponent(currentPath.join('/')));

    if (error) {
      console.error('Error listing folder contents:', error);
      throw error;
    }

    for (const item of list) {
      const itemPath = [...currentPath, item.name];
      if (!item.id) {
        // This is a folder, recursively delete its contents
        await recursiveDelete(itemPath);
      }
    }

    // Now delete all items in the current folder
    const filesToRemove = list.map((item) =>
      decodeURIComponent([...currentPath, item.name].join('/'))
    );

    if (filesToRemove.length > 0) {
      const { error: removeError } = await client.storage
        .from(bucket)
        .remove(filesToRemove);
      if (removeError) {
        console.error('Error removing files:', removeError);
        throw removeError;
      }
    }

    // Delete the empty folder placeholder if it exists
    await client.storage
      .from(bucket)
      .remove([
        `${decodeURIComponent(
          currentPath.join('/')
        )}/${EMPTY_FOLDER_PLACEHOLDER_FILE_NAME}`
      ]);

    // Finally, delete the folder itself
    if (currentPath.length > 0) {
      await client.storage
        .from(bucket)
        .remove([decodeURIComponent(currentPath.join('/'))]);
    }
  }

  await recursiveDelete(path);
}

export async function download(client, { bucket, path }) {
  return client.storage.from(bucket).download(path);
}
